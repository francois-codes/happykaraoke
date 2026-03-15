//! Axum HTTP + WebSocket server; DB path and static dir received from main thread.
//! Binds to 0.0.0.0 so LAN clients can connect; serves API + built frontend (SPA).

use crate::backend::routes::{api_router, AppState, WsMessage};
use crate::backend::state::{SessionConfig, SharedSessionConfig};
use crate::backend::watcher;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::{ServeDir, ServeFile};

/// Prefer LAN IPv4 for host_url so the built app shows an address other devices can use.
/// Uses interface list first; in sandbox (e.g. macOS .app) that often fails, so fall back to
/// UDP "connect" to an external IP and read local_addr() (no data sent, sandbox-safe).
fn discover_host_url(port: u16) -> String {
    let from_interfaces = local_ip_address::list_afinet_netifas()
        .ok()
        .and_then(|addrs| {
            addrs
                .into_iter()
                .find(|(_, addr)| matches!(addr, std::net::IpAddr::V4(a) if !a.is_loopback()))
                .map(|(_, addr)| format!("http://{}:{}", addr, port))
        });
    if let Some(url) = from_interfaces {
        return url;
    }
    // Fallback: UDP socket "connect" to external IP, then local_addr() gives our LAN IP.
    if let Ok(addr) = (|| {
        let socket = std::net::UdpSocket::bind("0.0.0.0:0")?;
        socket.connect((std::net::IpAddr::V4(std::net::Ipv4Addr::new(8, 8, 8, 8)), 80u16))?;
        socket.local_addr()
    })() {
        if let std::net::SocketAddr::V4(v4) = addr {
            if !v4.ip().is_loopback() {
                return format!("http://{}:{}", v4.ip(), port);
            }
        }
    }
    format!("http://127.0.0.1:{}", port)
}

pub struct ServerConfig {
    pub db_path: PathBuf,
    /// Directory containing the built frontend (index.html + assets). If missing, only API is served.
    pub static_dir: PathBuf,
}

pub async fn run_server(
    port: u16,
    ws_tx: broadcast::Sender<WsMessage>,
    config_rx: std::sync::mpsc::Receiver<ServerConfig>,
) {
    let server_config = config_rx.recv().expect("receive server config");
    let db_path = server_config.db_path;
    let db = match crate::backend::db::Db::open(&db_path) {
        Ok(d) => Arc::new(d),
        Err(e) => {
            eprintln!("Failed to open DB at {}: {}", db_path.display(), e);
            return;
        }
    };
    let song_folder = db.get_config("song_folder").ok().flatten().unwrap_or_default();
    let host_url = discover_host_url(port);
    let config: SharedSessionConfig = std::sync::Arc::new(std::sync::RwLock::new(SessionConfig {
        current_song: None,
        transpo: 0,
        songs_folder: song_folder.clone(),
        host_url,
    }));
    let watcher_tx = watcher::spawn_watcher_manager(ws_tx.clone());
    let _ = watcher_tx.send(song_folder.clone());
    let watcher_restart_tx = Some(Arc::new(watcher_tx));
    let state = AppState {
        db: db.clone(),
        config,
        ws_tx: ws_tx.clone(),
        watcher_restart_tx,
    };
    let api = api_router(state);

    // Serve built frontend so browsers can open http://127.0.0.1:8081/join or http://<LAN-IP>:8081/join .
    let index_path = server_config.static_dir.join("index.html");
    let app = if index_path.exists() {
        let serve_dir = ServeDir::new(server_config.static_dir.clone())
            .append_index_html_on_directories(false)
            .fallback(ServeFile::new(index_path));
        eprintln!(
            "Serving app at http://127.0.0.1:{}/ and http://<this-machine-IP>:{}/ (e.g. /join)",
            port, port
        );
        api.merge(axum::Router::new().nest_service("/", serve_dir))
    } else {
        eprintln!(
            "Static frontend not found at {} - GET /join will 404. Run 'npm run build:client' and restart.",
            server_config.static_dir.display()
        );
        api
    };

    let app = app.layer(
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any),
    );

    // Bind to all interfaces so same-machine (127.0.0.1) and LAN clients can connect.
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    eprintln!("Server listening on http://127.0.0.1:{} (open in browser to join)", port);
    axum::serve(listener, app).await.expect("serve");
}
