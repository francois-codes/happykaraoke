//! In-memory session config (current song, transpo, songs folder, host URL).

use std::sync::RwLock;

#[derive(Clone, Default)]
pub struct SessionConfig {
    pub current_song: Option<String>,
    pub transpo: i32,
    pub songs_folder: String,
    pub host_url: String,
}

pub type SharedSessionConfig = std::sync::Arc<RwLock<SessionConfig>>;
