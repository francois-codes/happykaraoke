//! SQLite database (rusqlite) matching Drizzle schema and session/user/queue logic.

use rusqlite::{params, Connection, Result as SqlResult};
use std::path::Path;
use std::sync::Mutex;

pub struct Db(Mutex<Connection>);

#[derive(Debug, Clone)]
pub struct SessionRow {
    pub id: i64,
    pub session_date: String,
    pub closed: i32,
}

#[derive(Debug, Clone)]
pub struct UserRow {
    pub id: i64,
    pub name: String,
    pub type_: String,
    pub session_id: i64,
}

#[derive(Debug, Clone)]
pub struct SessionLogRow {
    pub id: i64,
    pub song: String,
    pub username: Option<String>,
    pub timestamp: String,
    pub session_id: i64,
}

#[derive(Debug, Clone)]
pub struct QueueRow {
    pub id: i64,
    pub song: String,
    pub order: i32,
    pub user_id: Option<i64>,
    pub session_id: i64,
}

impl Db {
    pub fn open(path: impl AsRef<Path>) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        init_schema(&conn)?;
        Ok(Self(Mutex::new(conn)))
    }

    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.0.lock().expect("db lock")
    }

    pub fn get_config(&self, key: &str) -> SqlResult<Option<String>> {
        let conn = self.conn();
        let mut stmt = conn.prepare("SELECT value FROM config WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(row.get(0)?));
        }
        Ok(None)
    }

    pub fn set_config(&self, key: &str, value: &str) -> SqlResult<()> {
        let conn = self.conn();
        let existing: Option<i64> = conn
            .query_row("SELECT id FROM config WHERE key = ?1", params![key], |r| r.get(0))
            .ok();
        match existing {
            Some(id) => {
                conn.execute("UPDATE config SET value = ?1 WHERE id = ?2", params![value, id])?;
            }
            None => {
                conn.execute("INSERT INTO config (key, value) VALUES (?1, ?2)", params![key, value])?;
            }
        }
        Ok(())
    }

    pub fn get_current_session(&self) -> SqlResult<Option<SessionRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, sessionDate, closed FROM session WHERE closed = 0 LIMIT 1"
        )?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(SessionRow {
                id: row.get(0)?,
                session_date: row.get(1)?,
                closed: row.get(2)?,
            }));
        }
        Ok(None)
    }

    pub fn start_session(&self) -> SqlResult<SessionRow> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO session (sessionDate, closed) VALUES (datetime('now'), 0)",
            [],
        )?;
        let id = conn.last_insert_rowid();
        let mut stmt = conn.prepare("SELECT id, sessionDate, closed FROM session WHERE id = ?1")?;
        let row = stmt.query_row(params![id], |r| {
            Ok(SessionRow {
                id: r.get(0)?,
                session_date: r.get(1)?,
                closed: r.get(2)?,
            })
        })?;
        Ok(row)
    }

    pub fn close_sessions(&self) -> SqlResult<Vec<i64>> {
        let conn = self.conn();
        let ids: Vec<i64> = conn.prepare("SELECT id FROM session WHERE closed = 0")?
            .query_map([], |r| r.get(0))?
            .collect::<SqlResult<Vec<_>>>()?;
        for id in &ids {
            conn.execute("UPDATE session SET closed = 1 WHERE id = ?1", params![id])?;
        }
        Ok(ids)
    }

    pub fn delete_guest_users_and_queue_for_sessions(&self, session_ids: &[i64]) -> SqlResult<()> {
        if session_ids.is_empty() {
            return Ok(());
        }
        let conn = self.conn();
        let placeholders = session_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>()
            .join(",");
        conn.execute(
            &format!("DELETE FROM user WHERE sessionId IN ({}) AND type = 'GUEST'", placeholders),
            rusqlite::params_from_iter(session_ids.iter().copied()),
        )?;
        conn.execute(
            &format!("DELETE FROM queue WHERE sessionId IN ({})", placeholders),
            rusqlite::params_from_iter(session_ids.iter().copied()),
        )?;
        Ok(())
    }

    pub fn update_admin_users_to_session(&self, target_session_id: i64) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute(
            "UPDATE user SET sessionId = ?1 WHERE type = 'ADMIN' AND sessionId IN (SELECT id FROM session WHERE closed = 1)",
            params![target_session_id],
        )?;
        Ok(())
    }

    pub fn get_last_session_log(&self, session_id: i64) -> SqlResult<Option<SessionLogRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, song, username, timestamp, sessionId FROM session_log WHERE sessionId = ?1 ORDER BY id DESC LIMIT 1"
        )?;
        let mut rows = stmt.query(params![session_id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(SessionLogRow {
                id: row.get(0)?,
                song: row.get(1)?,
                username: row.get(2)?,
                timestamp: row.get(3)?,
                session_id: row.get(4)?,
            }));
        }
        Ok(None)
    }

    pub fn add_session_log(&self, session_id: i64, song: &str) -> SqlResult<i64> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO session_log (song, timestamp, sessionId) VALUES (?1, datetime('now'), ?2)",
            params![song, session_id],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn delete_last_session_log_if_recent(&self, session_id: i64, log_id: i64, minutes_gap: i64) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute(
            "DELETE FROM session_log WHERE id = ?1 AND sessionId = ?2 AND (julianday('now') - julianday(timestamp)) * 24 * 60 < ?3",
            params![log_id, session_id, minutes_gap],
        )?;
        Ok(())
    }

    pub fn get_user(&self, user_id: i64, session_id: i64) -> SqlResult<Option<UserRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, type, sessionId FROM user WHERE id = ?1 AND sessionId = ?2 LIMIT 1"
        )?;
        let mut rows = stmt.query(params![user_id, session_id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(UserRow {
                id: row.get(0)?,
                name: row.get(1)?,
                type_: row.get(2)?,
                session_id: row.get(3)?,
            }));
        }
        Ok(None)
    }

    pub fn create_user(&self, name: &str, type_: &str, session_id: i64) -> SqlResult<UserRow> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO user (name, type, sessionId) VALUES (?1, ?2, ?3)",
            params![name, type_, session_id],
        )?;
        let id = conn.last_insert_rowid();
        let mut stmt = conn.prepare("SELECT id, name, type, sessionId FROM user WHERE id = ?1")?;
        let row = stmt.query_row(params![id], |r| {
            Ok(UserRow {
                id: r.get(0)?,
                name: r.get(1)?,
                type_: r.get(2)?,
                session_id: r.get(3)?,
            })
        })?;
        Ok(row)
    }

    pub fn get_queue_for_session(&self, session_id: i64) -> SqlResult<Vec<(QueueRow, Option<String>)>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT q.id, q.song, q.\"order\", q.userId, q.sessionId, u.name \
             FROM queue q LEFT JOIN user u ON q.userId = u.id \
             WHERE q.sessionId = ?1 ORDER BY q.\"order\" ASC"
        )?;
        let rows = stmt.query_map(params![session_id], |r| {
            Ok((
                QueueRow {
                    id: r.get(0)?,
                    song: r.get(1)?,
                    order: r.get(2)?,
                    user_id: r.get(3)?,
                    session_id: r.get(4)?,
                },
                r.get::<_, Option<String>>(5)?,
            ))
        })?;
        rows.collect()
    }

    pub fn get_last_queue_order(&self, session_id: i64) -> SqlResult<Option<i32>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT \"order\" FROM queue WHERE sessionId = ?1 ORDER BY \"order\" DESC LIMIT 1"
        )?;
        let mut rows = stmt.query(params![session_id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(row.get(0)?));
        }
        Ok(None)
    }

    pub fn add_to_queue(&self, session_id: i64, song: &str, user_id: Option<i64>, order: i32) -> SqlResult<i64> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO queue (song, \"order\", userId, sessionId) VALUES (?1, ?2, ?3, ?4)",
            params![song, order, user_id, session_id],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn remove_from_queue(&self, queue_id: i64) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM queue WHERE id = ?1", params![queue_id])?;
        Ok(())
    }

    pub fn update_queue_order(&self, queue_id: i64, order: i32) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute("UPDATE queue SET \"order\" = ?1 WHERE id = ?2", params![order, queue_id])?;
        Ok(())
    }

    pub fn clear_queue(&self, session_id: i64) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM queue WHERE sessionId = ?1", params![session_id])?;
        Ok(())
    }

    pub fn get_session_logs(&self, session_id: i64) -> SqlResult<Vec<SessionLogRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, song, username, timestamp, sessionId FROM session_log WHERE sessionId = ?1 ORDER BY id"
        )?;
        let rows = stmt.query_map(params![session_id], |r| {
            Ok(SessionLogRow {
                id: r.get(0)?,
                song: r.get(1)?,
                username: r.get(2)?,
                timestamp: r.get(3)?,
                session_id: r.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_all_closed_sessions_with_count(&self) -> SqlResult<Vec<(SessionRow, i64)>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.sessionDate, s.closed, COUNT(l.id) as songCount \
             FROM session s LEFT JOIN session_log l ON s.id = l.sessionId \
             WHERE s.closed = 1 GROUP BY s.id"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok((
                SessionRow {
                    id: r.get(0)?,
                    session_date: r.get(1)?,
                    closed: r.get(2)?,
                },
                r.get::<_, i64>(3)?,
            ))
        })?;
        rows.collect()
    }

    pub fn delete_session_log_entries(&self, session_id: i64) -> SqlResult<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM session_log WHERE sessionId = ?1", params![session_id])?;
        conn.execute("DELETE FROM session WHERE id = ?1", params![session_id])?;
        Ok(())
    }

    pub fn get_song_stats(&self) -> SqlResult<Vec<(String, i64)>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT song, COUNT(*) as cnt FROM session_log GROUP BY song ORDER BY cnt DESC"
        )?;
        let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))?;
        rows.collect()
    }
}

fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS session (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionDate TEXT NOT NULL,
            closed INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            sessionId INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song TEXT NOT NULL,
            username TEXT,
            timestamp TEXT NOT NULL,
            sessionId INTEGER NOT NULL,
            FOREIGN KEY (sessionId) REFERENCES session(id)
        );
        CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song TEXT NOT NULL,
            "order" INTEGER NOT NULL,
            userId INTEGER REFERENCES user(id),
            sessionId INTEGER NOT NULL,
            FOREIGN KEY (sessionId) REFERENCES session(id),
            UNIQUE("order", sessionId)
        );
        "#,
    )?;
    Ok(())
}
