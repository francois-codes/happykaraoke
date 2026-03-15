//! List and load songs from the songs folder (.txt files). Parsing matches TS Song class.

use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongLine {
    pub content: String,
    pub r#type: String, // "lyrics" | "chords" | "section" | "spacer" | "break"
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    pub title: String,
    pub author: String,
    pub key: String,
    pub tags: Vec<String>,
    pub lines: Vec<SongLine>,
    pub filename: String,
}

#[derive(Debug, Serialize)]
pub struct SongListItem {
    pub title: String,
    pub author: String,
    pub filename: String,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
}

fn line_type(s: &str) -> &'static str {
    if s.is_empty() {
        return "break";
    }
    if s.starts_with('#') || s.starts_with('[') {
        return "section";
    }
    if is_chord_line(s) {
        return "chords";
    }
    "lyrics"
}

fn is_chord_line(line: &str) -> bool {
    let binding = line
        .replace('_', "|")
        .replace(|c: char| c == '(' || c == ')', "");
    let words: Vec<&str> = binding
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .collect();
    if words.is_empty() {
        return false;
    }
    words.iter().all(|w| is_chord_word(w))
}

fn is_chord_word(w: &str) -> bool {
    let w = w.trim();
    if w.is_empty() {
        return true;
    }
    if w == "|" || w == "NC" || w == "N.C" || w == "N.C." || w == "_" || w == "%" {
        return true;
    }
    if w.len() >= 2 && w.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) && w.contains('/') {
        return true;
    }
    let first = w.chars().next().unwrap_or(' ');
    matches!(first, 'A'..='G' | 'a'..='g') || first == '|' || first == '%' || first == '<'
}

fn parse_lines(lines: &[String]) -> Vec<SongLine> {
    let raw: Vec<SongLine> = lines
        .iter()
        .map(|l| {
            let t = line_type(l);
            let content = if l.is_empty() { "(...)".to_string() } else { l.clone() };
            SongLine {
                content,
                r#type: t.to_string(),
            }
        })
        .collect();
    let mut out = Vec::with_capacity(raw.len());
    for (i, line) in raw.iter().enumerate() {
        let t = if line.r#type == "break" && i > 1 {
            let prev = raw.get(i.saturating_sub(1));
            let next = raw.get(i + 1);
            if prev.map(|p| p.r#type == "lyrics").unwrap_or(false)
                && next.map(|n| n.r#type == "chords").unwrap_or(false)
            {
                "section"
            } else if prev.map(|p| p.r#type == "chords").unwrap_or(false) {
                "spacer"
            } else {
                &line.r#type
            }
        } else {
            &line.r#type
        };
        if line.r#type == "section" && t == "section" && line.content.is_empty() && i > 1 {
            let prev = raw.get(i.saturating_sub(1));
            if prev.map(|p| p.r#type == "section").unwrap_or(false) {
                out.push(SongLine {
                    content: line.content.clone(),
                    r#type: "chords".to_string(),
                });
                continue;
            }
        }
        if line.r#type == "break" && i > 1 {
            let prev = raw.get(i.saturating_sub(1));
            if prev.map(|p| p.r#type == "chords").unwrap_or(false) {
                out.push(SongLine {
                    content: "(...)".to_string(),
                    r#type: "spacer".to_string(),
                });
                continue;
            }
        }
        out.push(SongLine {
            content: line.content.clone(),
            r#type: t.to_string(),
        });
    }
    out
}

pub fn load_song(songs_folder: &str, title: &str) -> std::io::Result<SongData> {
    let dir = Path::new(songs_folder);
    let filename = format!("{}.txt", title);
    let path = dir.join(&filename);
    let content = if path.exists() {
        fs::read_to_string(&path)?
    } else {
        let entries = fs::read_dir(dir)?;
        let found = entries
            .filter_map(|e| e.ok())
            .find(|e| {
                e.path()
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| s.trim().to_lowercase() == title.trim().to_lowercase())
                    .unwrap_or(false)
            });
        match found {
            Some(entry) => fs::read_to_string(entry.path())?,
            None => return Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Song not found")),
        }
    };
    let lines: Vec<&str> = content.lines().collect();
    if lines.len() < 4 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid song format",
        ));
    }
    let title_line = lines[0].trim().to_string();
    let author = lines[1].trim().to_string();
    let key = lines[2].trim().to_string();
    let tags: Vec<String> = lines[3]
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();
    let body: Vec<String> = lines[5..].iter().map(|s| (*s).to_string()).collect();
    let song_lines = parse_lines(&body);
    Ok(SongData {
        title: title_line,
        author,
        key,
        tags,
        lines: song_lines,
        filename: title.to_string(),
    })
}

pub fn list_songs(songs_folder: &str, with_key: bool) -> Vec<SongListItem> {
    let dir = match Path::new(songs_folder).read_dir() {
        Ok(d) => d,
        Err(_) => return vec![],
    };
    const EXCLUDE: &[&str] = &[".DS_Store", "_old", ".", "..", "Icon"];
    let mut items: Vec<SongListItem> = dir
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".txt") || EXCLUDE.contains(&name.as_str()) {
                return None;
            }
            let filename = name.trim_end_matches(".txt").to_string();
            match load_song(songs_folder, &filename) {
                Ok(s) => Some(SongListItem {
                    title: s.title,
                    author: s.author,
                    filename,
                    tags: s.tags,
                    key: if with_key { Some(s.key) } else { None },
                }),
                Err(_) => None,
            }
        })
        .collect();
    items.sort_by(|a, b| {
        a.author
            .to_lowercase()
            .cmp(&b.author.to_lowercase())
            .then_with(|| a.title.to_lowercase().cmp(&b.title.to_lowercase()))
    });
    items
}
