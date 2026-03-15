#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use tauri::Manager;

const API_PORT: u16 = 8081;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (ws_tx, _) = tokio::sync::broadcast::channel::<backend::WsMessage>(64);
    let (path_tx, path_rx) = std::sync::mpsc::channel();
    let ws_tx_server = ws_tx.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let db_path = app
                .path()
                .resource_dir()
                .map(|p: std::path::PathBuf| p.join("db.sqlite"))
                .unwrap_or_else(|_| {
                    std::env::current_dir()
                        .unwrap_or_else(|_| std::path::PathBuf::from("."))
                        .join("resources")
                        .join("db.sqlite")
                });
            if let Some(parent) = db_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            // Built frontend path so LAN / same-machine browsers can open http://127.0.0.1:8081/join .
            // When packaged: frontend is in bundle resources (tauri.conf "resources").
            // In dev: try cwd/out/client and cwd/../out/client (Cargo may run from project root or src-tauri).
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let candidates = [
                app.path().resource_dir().ok().map(|r| r.join("out").join("client")),
                Some(cwd.join("out").join("client")),
                Some(cwd.join("..").join("out").join("client")),
            ];
            let static_dir = candidates
                .into_iter()
                .flatten()
                .find(|p| p.join("index.html").exists())
                .unwrap_or_else(|| cwd.join("out").join("client"));
            path_tx
                .send(backend::ServerConfig {
                    db_path,
                    static_dir,
                })
                .expect("send server config");
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
                rt.block_on(backend::run_server(API_PORT, ws_tx_server, path_rx));
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
