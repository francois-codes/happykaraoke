//! Axum REST routes matching Express endpoints.

use crate::backend::db::Db;
use crate::backend::session_logic::{add_session_log_with_gap, check_and_refresh_session, start_session_if_needed};
use crate::backend::songs::{list_songs, load_song, SongListItem};
use crate::backend::state::SharedSessionConfig;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;

const ADMIN_PASSWORD: &str = "Ab=G#";

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Db>,
    pub config: SharedSessionConfig,
    pub ws_tx: broadcast::Sender<WsMessage>,
    /// When Some, send folder path to restart the file watcher (set-songs-folder / save-song).
    pub watcher_restart_tx: Option<Arc<std::sync::mpsc::Sender<String>>>,
}

#[derive(Clone, Serialize)]
pub struct WsMessage {
    pub event: String,
    pub payload: serde_json::Value,
}

fn emit(state: &AppState, event: &str, payload: serde_json::Value) {
    let _ = state.ws_tx.send(WsMessage {
        event: event.to_string(),
        payload,
    });
}

pub fn api_router(state: AppState) -> Router {
    Router::new()
        .route("/ws", get(crate::backend::ws::ws_handler))
        .route("/health", get(health))
        .route("/login", post(login))
        .route("/user", get(fetch_user))
        .route("/join", post(join))
        .route("/song", get(get_song))
        .route("/songs", get(get_songs_list))
        .route("/csv", get(get_csv))
        .route("/set-song", post(change_song))
        .route("/set-transpo", post(set_transpo))
        .route("/scroll", post(set_scroll))
        .route("/scroll-master", post(enable_scroll_master))
        .route("/fetch-session", get(fetch_session_config))
        .route("/set-songs-folder", post(set_songs_folder))
        .route("/fetch-session-log", get(fetch_session_log))
        .route("/fetch-all-sessions", get(fetch_all_sessions))
        .route("/close-session", post(close_session))
        .route("/delete-session-log", post(delete_session_log))
        .route("/refresh-session", post(refresh_session))
        .route("/get-queue", get(get_queue))
        .route("/add-song-to-queue", post(add_to_queue))
        .route("/remove-song-from-queue", post(remove_from_queue))
        .route("/reorder-queue", post(reorder_queue))
        .route("/clear-queue", post(clear_queue))
        .route("/set-openai-key", post(set_openai_key))
        .route("/get-openai-key", get(get_openai_key))
        .route("/generate-song", post(generate_song))
        .route("/save-song", post(save_song))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "ok": true }))
}

#[derive(Deserialize)]
struct LoginBody {
    password: Option<String>,
}

#[derive(Serialize)]
struct UserResponse {
    id: i64,
    name: String,
    r#type: String,
}

#[derive(Serialize)]
struct LoginResponse {
    user: UserResponse,
}

async fn login(State(state): State<AppState>, Json(body): Json<LoginBody>) -> impl IntoResponse {
    if body.password.as_deref() != Some(ADMIN_PASSWORD) {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::Value::Null)).into_response();
    }
    let session = match start_session_if_needed(&state.db) {
        Ok(s) => s,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response(),
    };
    let user = match state.db.create_user("admin", "ADMIN", session.id) {
        Ok(u) => u,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response(),
    };
    (
        StatusCode::OK,
        Json(LoginResponse {
            user: UserResponse {
                id: user.id,
                name: user.name,
                r#type: user.type_,
            },
        }),
    )
        .into_response()
}

#[derive(Deserialize)]
struct UserQuery {
    id: String,
}

async fn fetch_user(State(state): State<AppState>, Query(q): Query<UserQuery>) -> impl IntoResponse {
    let id: i64 = match q.id.parse() {
        Ok(i) => i,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::Value::Null)).into_response(),
    };
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return (StatusCode::NOT_FOUND, Json(serde_json::Value::Null)).into_response(),
    };
    let user = match state.db.get_user(id, session.id) {
        Ok(Some(u)) => u,
        _ => return (StatusCode::NOT_FOUND, Json(serde_json::Value::Null)).into_response(),
    };
    (
        StatusCode::OK,
        Json(LoginResponse {
            user: UserResponse {
                id: user.id,
                name: user.name,
                r#type: user.type_,
            },
        }),
    )
        .into_response()
}

#[derive(Deserialize)]
struct JoinBody {
    userName: Option<String>,
    adminPassword: Option<String>,
}

async fn join(State(state): State<AppState>, Json(body): Json<JoinBody>) -> impl IntoResponse {
    let name = body.userName.unwrap_or_else(|| "Guest".to_string());
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return (StatusCode::UNAUTHORIZED, Json(serde_json::Value::Null)).into_response(),
    };
    let type_ = if body.adminPassword.as_deref() == Some(ADMIN_PASSWORD) {
        "ADMIN"
    } else {
        "GUEST"
    };
    let user = match state.db.create_user(&name, type_, session.id) {
        Ok(u) => u,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::Value::Null)).into_response(),
    };
    (
        StatusCode::OK,
        Json(LoginResponse {
            user: UserResponse {
                id: user.id,
                name: user.name,
                r#type: user.type_,
            },
        }),
    )
        .into_response()
}

#[derive(Deserialize)]
struct SongQuery {
    title: Option<String>,
}

async fn get_song(State(state): State<AppState>, Query(q): Query<SongQuery>) -> impl IntoResponse {
    let title = match &q.title {
        Some(t) => t.clone(),
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::Value::Null)).into_response(),
    };
    let folder = state.config.read().unwrap().songs_folder.clone();
    if folder.is_empty() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response();
    }
    match load_song(&folder, &title) {
        Ok(song) => (
            StatusCode::OK,
            Json(serde_json::json!({ "song": song })),
        )
            .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response(),
    }
}

async fn get_songs_list(State(state): State<AppState>) -> impl IntoResponse {
    let folder = state.config.read().unwrap().songs_folder.clone();
    let songs: Vec<SongListItem> = list_songs(&folder, false);
    (
        StatusCode::OK,
        Json(serde_json::json!({ "songs": songs })),
    )
        .into_response()
}

async fn get_csv(State(state): State<AppState>) -> impl IntoResponse {
    let folder = state.config.read().unwrap().songs_folder.clone();
    let songs = list_songs(&folder, true);
    let stats = state.db.get_song_stats().unwrap_or_default();
    let stats_map: std::collections::HashMap<String, i64> = stats.into_iter().map(|(k, v)| (k.to_lowercase(), v)).collect();
    let lines: Vec<String> = std::iter::once("artiste;titre;key;tags;play count".to_string())
        .chain(songs.into_iter().map(|s| {
            let key = format!("{} - {}", s.author.to_lowercase(), s.title.to_lowercase());
            let count = stats_map.get(&key).copied().unwrap_or(0);
            format!(
                "{};{};{};{};{}",
                s.author,
                s.title,
                s.key.unwrap_or_default(),
                s.tags.join(","),
                count
            )
        }))
        .collect();
    let csv = lines.join("\n");
    (StatusCode::OK, Json(serde_json::json!({ "csv": csv }))).into_response()
}

#[derive(Deserialize)]
struct SetSongBody {
    title: Option<String>,
}

async fn change_song(State(state): State<AppState>, Json(body): Json<SetSongBody>) -> impl IntoResponse {
    let title = match &body.title {
        Some(t) => t.clone(),
        None => return StatusCode::BAD_REQUEST.into_response(),
    };
    let _ = check_and_refresh_session(&state.db);
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let _ = add_session_log_with_gap(&state.db, session.id, &title);
    {
        let mut c = state.config.write().unwrap();
        c.current_song = Some(title.clone());
        c.transpo = 0;
    }
    emit(&state, "song:changed", serde_json::json!({ "title": title }));
    emit(&state, "transpo:changed", serde_json::json!({ "transpo": 0 }));
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct SetTranspoBody {
    transpo: Option<i32>,
}

async fn set_transpo(State(state): State<AppState>, Json(body): Json<SetTranspoBody>) -> impl IntoResponse {
    let transpo = body.transpo.unwrap_or(0);
    {
        let mut c = state.config.write().unwrap();
        c.transpo = transpo;
    }
    emit(&state, "transpo:changed", serde_json::json!({ "transpo": transpo }));
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct ScrollBody {
    r#type: Option<String>,
    value: Option<f64>,
}

async fn set_scroll(State(state): State<AppState>, Json(body): Json<ScrollBody>) -> impl IntoResponse {
    let payload = serde_json::json!({
        "type": body.r#type,
        "value": body.value
    });
    emit(&state, "scroll:changed", payload);
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct ScrollMasterBody {
    userId: Option<String>,
}

async fn enable_scroll_master(State(state): State<AppState>, Json(body): Json<ScrollMasterBody>) -> impl IntoResponse {
    let payload = serde_json::json!({ "userId": body.userId });
    emit(&state, "scroll:master:enabled", payload);
    StatusCode::OK.into_response()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionConfigResponse {
    current_song: Option<String>,
    transpo: i32,
    songs_folder: String,
    host_url: String,
}

async fn fetch_session_config(State(state): State<AppState>) -> Json<SessionConfigResponse> {
    let c = state.config.read().unwrap();
    Json(SessionConfigResponse {
        current_song: c.current_song.clone(),
        transpo: c.transpo,
        songs_folder: c.songs_folder.clone(),
        host_url: c.host_url.clone(),
    })
}

#[derive(Deserialize)]
struct SetSongsFolderBody {
    folder: Option<String>,
}

async fn set_songs_folder(State(state): State<AppState>, Json(body): Json<SetSongsFolderBody>) -> impl IntoResponse {
    let folder = body.folder.unwrap_or_default();
    if state.db.set_config("song_folder", &folder).is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    }
    {
        let mut c = state.config.write().unwrap();
        c.songs_folder = folder.clone();
    }
    if let Some(ref tx) = state.watcher_restart_tx {
        let _ = tx.send(folder);
    }
    emit(&state, "folder:changed", serde_json::Value::Null);
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct SessionLogQuery {
    sessionId: String,
}

async fn fetch_session_log(State(state): State<AppState>, Query(q): Query<SessionLogQuery>) -> impl IntoResponse {
    let id: i64 = match q.sessionId.parse() {
        Ok(i) => i,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::Value::Null)).into_response(),
    };
    let logs = state.db.get_session_logs(id).unwrap_or_default();
    let out: Vec<serde_json::Value> = logs
        .into_iter()
        .map(|l| {
            serde_json::json!({
                "id": l.id,
                "song": l.song,
                "username": l.username,
                "timestamp": l.timestamp,
                "sessionId": l.session_id
            })
        })
        .collect();
    (StatusCode::OK, Json(out)).into_response()
}

async fn fetch_all_sessions(State(state): State<AppState>) -> impl IntoResponse {
    let rows = state.db.get_all_closed_sessions_with_count().unwrap_or_default();
    let out: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(s, count)| {
            serde_json::json!({
                "id": s.id,
                "sessionDate": s.session_date,
                "closed": s.closed,
                "songCount": count
            })
        })
        .collect();
    (StatusCode::OK, Json(out)).into_response()
}

async fn close_session(State(state): State<AppState>) -> impl IntoResponse {
    let closed_ids = state.db.close_sessions().unwrap_or_default();
    let _ = state.db.delete_guest_users_and_queue_for_sessions(&closed_ids);
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct DeleteSessionLogBody {
    sessionId: Option<i64>,
}

async fn delete_session_log(State(state): State<AppState>, Json(body): Json<DeleteSessionLogBody>) -> impl IntoResponse {
    if let Some(id) = body.sessionId {
        let _ = state.db.delete_session_log_entries(id);
    }
    StatusCode::OK.into_response()
}

async fn refresh_session(State(state): State<AppState>) -> impl IntoResponse {
    let session = match check_and_refresh_session(&state.db) {
        Ok(s) => s,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response(),
    };
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "id": session.id,
            "sessionDate": session.session_date,
            "closed": session.closed
        })),
    )
        .into_response()
}

#[derive(Serialize)]
struct QueueItemResponse {
    id: i64,
    song: String,
    order: i32,
    userId: Option<i64>,
    sessionId: i64,
    user: Option<String>,
}

async fn get_queue(State(state): State<AppState>) -> impl IntoResponse {
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::Value::Null)).into_response(),
    };
    let rows = state.db.get_queue_for_session(session.id).unwrap_or_default();
    let queue: Vec<QueueItemResponse> = rows
        .into_iter()
        .map(|(q, name)| QueueItemResponse {
            id: q.id,
            song: q.song,
            order: q.order,
            userId: q.user_id,
            sessionId: q.session_id,
            user: name,
        })
        .collect();
    (StatusCode::OK, Json(serde_json::json!({ "queue": queue }))).into_response()
}

#[derive(Deserialize)]
struct AddQueueBody {
    song: Option<String>,
    userId: Option<String>,
}

async fn add_to_queue(State(state): State<AppState>, Json(body): Json<AddQueueBody>) -> impl IntoResponse {
    let song = body.song.unwrap_or_default();
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let order = state.db.get_last_queue_order(session.id).unwrap_or(Some(0)).unwrap_or(0) + 1;
    let user_id = body.userId.and_then(|s| s.parse().ok());
    let _ = state.db.add_to_queue(session.id, &song, user_id, order);
    emit(&state, "queue:changed", serde_json::json!({}));
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct RemoveQueueBody {
    queueId: Option<i64>,
}

async fn remove_from_queue(State(state): State<AppState>, Json(body): Json<RemoveQueueBody>) -> impl IntoResponse {
    if let Some(id) = body.queueId {
        let _ = state.db.remove_from_queue(id);
    }
    emit(&state, "queue:changed", serde_json::json!({}));
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct ReorderQueueBody {
    queue: Option<Vec<ReorderItem>>,
}

#[derive(Deserialize)]
struct ReorderItem {
    id: i64,
    order: i32,
}

async fn reorder_queue(State(state): State<AppState>, Json(body): Json<ReorderQueueBody>) -> impl IntoResponse {
    let items = body.queue.unwrap_or_default();
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let max_order = state.db.get_last_queue_order(session.id).unwrap_or(Some(0)).unwrap_or(0);
    let offset = max_order + 1;
    for item in items {
        let _ = state.db.update_queue_order(item.id, item.order + offset);
    }
    emit(&state, "queue:changed", serde_json::json!({}));
    StatusCode::OK.into_response()
}

async fn clear_queue(State(state): State<AppState>) -> impl IntoResponse {
    let session = match state.db.get_current_session() {
        Ok(Some(s)) => s,
        _ => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let _ = state.db.clear_queue(session.id);
    emit(&state, "queue:changed", serde_json::json!({}));
    StatusCode::OK.into_response()
}

#[derive(Deserialize)]
struct SetOpenAIKeyBody {
    apiKey: Option<String>,
}

async fn set_openai_key(State(state): State<AppState>, Json(body): Json<SetOpenAIKeyBody>) -> impl IntoResponse {
    let key = body.apiKey.unwrap_or_default().trim().to_string();
    if key.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "API key is required" }))).into_response();
    }
    let _ = state.db.set_config("openai_api_key", &key);
    StatusCode::OK.into_response()
}

async fn get_openai_key(State(state): State<AppState>) -> impl IntoResponse {
    let key = state.db.get_config("openai_api_key").ok().flatten();
    let has_key = key.map(|k| !k.trim().is_empty()).unwrap_or(false);
    (StatusCode::OK, Json(serde_json::json!({ "hasKey": has_key }))).into_response()
}

#[derive(Deserialize)]
struct GenerateSongBody {
    songName: Option<String>,
    artistName: Option<String>,
    url: Option<String>,
    tags: Option<String>,
}

async fn generate_song(
    State(state): State<AppState>,
    Json(body): Json<GenerateSongBody>,
) -> impl IntoResponse {
    let url = body.url.as_deref();
    let song_name = body.songName.as_deref();
    let artist_name = body.artistName.as_deref();
    if url.is_none() && (song_name.is_none() || artist_name.is_none()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Either provide song name + artist name, or provide a URL" })),
        )
            .into_response();
    }
    if url.is_some() && (song_name.is_some() || artist_name.is_some()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Provide either URL or song name + artist name, not both" })),
        )
            .into_response();
    }
    let api_key = match state.db.get_config("openai_api_key").ok().flatten() {
        Some(k) if !k.trim().is_empty() => k,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Clé API Perplexity non configurée. Veuillez d'abord configurer votre clé." })),
            )
                .into_response();
        }
    };
    let content = match crate::backend::ai::generate_song_content(
        &api_key,
        song_name,
        artist_name,
        url,
    )
    .await
    {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response();
        }
    };
    if content.starts_with("ERROR:") {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Impossible de trouver une transcription précise pour cette chanson. Veuillez vérifier le nom de la chanson et de l'artiste, ou essayez une autre chanson."
            })),
        )
            .into_response();
    }
    let (title, author, key, tags_line, _content_from_6) = match crate::backend::ai::parse_generated(&content) {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response();
        }
    };
    let filename = crate::backend::ai::filename_from_author_title(&author, &title);
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "title": title,
            "author": author,
            "key": key,
            "tags": body.tags.unwrap_or(tags_line),
            "content": content,
            "filename": filename
        })),
    )
        .into_response()
}

#[derive(Deserialize)]
struct SaveSongBody {
    filename: Option<String>,
    content: Option<String>,
}

async fn save_song(State(state): State<AppState>, Json(body): Json<SaveSongBody>) -> impl IntoResponse {
    let filename = body.filename.unwrap_or_default();
    let content = body.content.unwrap_or_default();
    if filename.is_empty() || content.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Filename and content are required" })),
        )
            .into_response();
    }
    let folder = state.config.read().unwrap().songs_folder.clone();
    if folder.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Songs folder is not configured" })),
        )
            .into_response();
    }
    let path = std::path::Path::new(&folder).join(&filename);
    if let Err(e) = std::fs::write(&path, content) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response();
    }
    if let Some(ref tx) = state.watcher_restart_tx {
        let _ = tx.send(folder.clone());
    }
    emit(&state, "folder:changed", serde_json::Value::Null);
    (
        StatusCode::OK,
        Json(serde_json::json!({ "success": true, "filePath": path.display().to_string() })),
    )
        .into_response()
}
