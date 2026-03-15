//! WebSocket handler: accept connections and broadcast server events to all clients.

use crate::backend::routes::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};

pub async fn ws_handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.ws_tx.subscribe();
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let json = serde_json::json!({
                "event": msg.event,
                "payload": msg.payload
            });
            if sender.send(Message::Text(json.to_string())).await.is_err() {
                break;
            }
        }
    });
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(_)) = receiver.next().await {
            // Ignore client messages; we only broadcast from server
        }
    });
    let _ = tokio::join!(send_task, recv_task);
}
