//! Perplexity API for AI song generation (lyrics + chords).

use reqwest::Client;
use serde::Deserialize;

const PERPLEXITY_URL: &str = "https://api.perplexity.ai/chat/completions";

#[derive(Deserialize)]
struct PerplexityResponse {
    choices: Option<Vec<Choice>>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Deserialize)]
struct Message {
    content: Option<String>,
}

pub async fn generate_song_content(
    api_key: &str,
    song_name: Option<&str>,
    artist_name: Option<&str>,
    url: Option<&str>,
) -> Result<String, String> {
    let prompt = if let Some(u) = url {
        let body = Client::new()
            .get(u)
            .send()
            .await
            .map_err(|e| format!("Impossible d'accéder à l'URL: {}", e))?;
        if !body.status().is_success() {
            return Err(format!("Impossible d'accéder à l'URL: {} {}", body.status(), body.status().as_str()));
        }
        let html = body.text().await.map_err(|e| e.to_string())?;
        let html = html.chars().take(50_000).collect::<String>();
        format!(
            r#"You are a music transcription assistant. Below is the HTML content from a webpage that contains song lyrics and chords. Extract the song's lyrics and chords from this content.

HTML CONTENT:
{}

CRITICAL INSTRUCTIONS:
- Extract the lyrics and chords from the HTML content provided above
- You MUST provide accurate lyrics and chords exactly as shown in the content
- DO NOT make up, invent, or hallucinate any lyrics or chords
- If you cannot find valid lyrics/chords content, respond with: "ERROR: Cannot extract valid song content from this page"
- Only provide transcriptions from the actual content

Format the output EXACTLY as follows (this is critical):

1. First line: Song title (extract from the page content)
2. Second line: Artist name (extract from the page content)
3. Third line: Musical key (single letter A-G, may include # or b, e.g., "C", "D#", "Bb" - infer if not explicitly stated)
4. Fourth line: Space-separated tags (e.g., "rock upbeat classic" or leave empty)
5. Fifth line: BLANK LINE (required)
6. Then the song content with:
   - Section headers starting with [ like [Verse 1], [Chorus], [Bridge]
   - Chord lines (only chords, space-separated)
   - Lyric lines (the words)
   - Blank lines between sections

IMPORTANT:
- Make sure chords are aligned above the correct syllables
- Use standard chord notation (C, Am, F, G7, Dsus4, etc.)
- Include section headers
- The key on line 3 should be just one letter with optional # or b
- DO NOT add any introductory text or explanations
- Start immediately with the song title

Extract and format the song content now:"#,
            html
        )
    } else {
        let song = song_name.unwrap_or("");
        let artist = artist_name.unwrap_or("");
        format!(
            r#"You are a music transcription assistant with web search capabilities. Search the internet to find accurate lyrics and chords for the song "{}" by {}.

CRITICAL INSTRUCTIONS:
- SEARCH the web for this song on sites like Ultimate Guitar, Chordify, AZChords, or other chord/lyrics sites
- You MUST provide accurate, real lyrics and chords from this actual song
- DO NOT make up, invent, or hallucinate any lyrics or chords
- If you cannot find the song after searching, respond with: "ERROR: Cannot find accurate transcription for this song"
- Only provide transcriptions you are highly confident are correct from your web search
- The lyrics must match the actual song exactly
- The chords must be accurate to the actual song from a reliable source

Format the output EXACTLY as follows (this is critical):

1. First line: Song title
2. Second line: Artist name
3. Third line: Musical key (single letter A-G, may include # or b, e.g., "C", "D#", "Bb")
4. Fourth line: Space-separated tags (e.g., "rock upbeat classic" or leave empty)
5. Fifth line: BLANK LINE (required)
6. Then the song content with:
   - Section headers starting with [ like [Verse 1], [Chorus], [Bridge]
   - Chord lines (only chords, space-separated)
   - Lyric lines (the words)
   - Blank lines between sections

IMPORTANT:
- Make sure chords are aligned above the correct syllables
- Use standard chord notation (C, Am, F, G7, Dsus4, etc.)
- Include section headers
- The key on line 3 should be just one letter with optional # or b
- DO NOT add any introductory text or explanations
- Start immediately with the song title

Find and format "{}" by {} now:"#,
            song, artist, song, artist
        )
    };

    let body = serde_json::json!({
        "model": "sonar-pro",
        "max_tokens": 4096,
        "messages": [{ "role": "user", "content": prompt }]
    });

    let res = Client::new()
        .post(PERPLEXITY_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Perplexity API error {}: {}", status, text));
    }

    let parsed: PerplexityResponse = res.json().await.map_err(|e| e.to_string())?;
    let content = parsed
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.message.content)
        .ok_or_else(|| "No content in Perplexity response".to_string())?;

    Ok(content.trim().to_string())
}

/// Parse generated content into title, author, key, tags, and full content. Returns (title, author, key, tags_line, full_content).
pub fn parse_generated(content: &str) -> Result<(String, String, String, String, String), String> {
    let lines: Vec<&str> = content.lines().collect();
    if lines.len() < 5 {
        return Err("Le format de la chanson générée est invalide.".to_string());
    }
    let title = lines[0].trim().to_string();
    let author = lines[1].trim().to_string();
    let key = lines[2].trim().to_string();
    let tags_line = lines[3].trim().to_string();
    let content_from_6 = lines[5..].join("\n");
    Ok((title, author, key, tags_line, content_from_6))
}

/// Build filename from author and title (sanitized).
pub fn filename_from_author_title(author: &str, title: &str) -> String {
    let sanitize = |s: &str| {
        s.to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' { c } else { ' ' })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("-")
            .replace("-+-", "-")
    };
    format!("{} - {}.txt", sanitize(author), sanitize(title))
}
