//! File watcher for songs folder: emit song-file:changed on .txt changes.
//! Supports restart when folder changes (set-songs-folder / save-song).

use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;
use tokio::sync::broadcast;

/// Start a watcher manager thread. It receives folder paths on `rx`;
/// when it receives a path it (re)starts watching that folder and emits song-file:changed.
/// Returns the sender to request (re)starts; drop the sender to stop the thread.
pub fn spawn_watcher_manager(
    ws_tx: broadcast::Sender<crate::backend::routes::WsMessage>,
) -> mpsc::Sender<String> {
    let (tx, rx) = mpsc::channel::<String>();
    std::thread::spawn(move || {
        let mut _debouncer: Option<Debouncer<notify::RecommendedWatcher>> = None;
        loop {
            let folder = match rx.recv() {
                Ok(f) => f,
                Err(_) => break,
            };
            drop(_debouncer.take());
            if folder.is_empty() {
                continue;
            }
            let path = Path::new(&folder);
            if !path.exists() || !path.is_dir() {
                continue;
            }
            let (ev_tx, ev_rx) = mpsc::channel();
            let ws_tx2 = ws_tx.clone();
            let mut deb = match new_debouncer(Duration::from_millis(300), move |res: DebounceEventResult| {
                let _ = ev_tx.send(res);
            }) {
                Ok(d) => d,
                Err(_) => continue,
            };
            if deb.watcher().watch(path, notify::RecursiveMode::NonRecursive).is_err() {
                continue;
            }
            _debouncer = Some(deb);
            std::thread::spawn(move || {
                for res in ev_rx {
                    if let Ok(events) = res {
                        for e in events {
                            if e.path.extension().map(|x| x == std::ffi::OsStr::new("txt")).unwrap_or(false) {
                                let filename = e.path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
                                let _ = ws_tx2.send(crate::backend::routes::WsMessage {
                                    event: "song-file:changed".to_string(),
                                    payload: serde_json::json!({ "filename": filename }),
                                });
                            }
                        }
                    }
                }
            });
        }
    });
    tx
}

/// One-shot watcher for a single folder (used when no restart is needed).
pub fn spawn_watcher(
    folder: String,
    ws_tx: broadcast::Sender<crate::backend::routes::WsMessage>,
) -> Option<Debouncer<notify::RecommendedWatcher>> {
    if folder.is_empty() {
        return None;
    }
    let path = Path::new(&folder);
    if !path.exists() || !path.is_dir() {
        return None;
    }
    let (tx, rx) = mpsc::channel();
    let mut debouncer = new_debouncer(Duration::from_millis(300), move |res: DebounceEventResult| {
        let _ = tx.send(res);
    })
    .ok()?;
    debouncer.watcher().watch(path, notify::RecursiveMode::NonRecursive).ok()?;
    let ws_tx2 = ws_tx.clone();
    std::thread::spawn(move || {
        for res in rx {
            if let Ok(events) = res {
                for e in events {
                    if e.path.extension().map(|x| x == std::ffi::OsStr::new("txt")).unwrap_or(false) {
                        let filename = e.path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
                        let _ = ws_tx2.send(crate::backend::routes::WsMessage {
                            event: "song-file:changed".to_string(),
                            payload: serde_json::json!({ "filename": filename }),
                        });
                    }
                }
            }
        }
    });
    Some(debouncer)
}
