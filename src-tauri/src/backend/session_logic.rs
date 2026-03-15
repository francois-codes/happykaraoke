//! Session lifecycle: start, close, check-and-refresh (timeout), add log.

use crate::backend::db::{Db, SessionRow};
use rusqlite::params;

const SESSION_TIMEOUT_MINUTES: i64 = 240;
const MIN_LOG_GAP_MINUTES: i64 = 2;

pub fn start_session_if_needed(db: &Db) -> rusqlite::Result<SessionRow> {
    if let Some(s) = db.get_current_session()? {
        db.update_admin_users_to_session(s.id)?;
        return Ok(s);
    }
    let row = db.start_session()?;
    db.update_admin_users_to_session(row.id)?;
    Ok(row)
}

pub fn minutes_since(conn: &rusqlite::Connection, iso_date: &str) -> f64 {
    conn.query_row(
        "SELECT (julianday('now') - julianday(?1)) * 24 * 60",
        params![iso_date],
        |r| r.get(0),
    ).unwrap_or(999.0)
}

pub fn check_and_refresh_session(db: &Db) -> rusqlite::Result<SessionRow> {
    let current = db.get_current_session()?;
    let current = match current {
        Some(c) => c,
        None => return start_session_if_needed(db),
    };
    let last_log = db.get_last_session_log(current.id)?;
    let minutes_since = if let Some(ref log) = last_log {
        minutes_since(&db.conn(), &log.timestamp)
    } else {
        minutes_since(&db.conn(), &current.session_date)
    };
    if minutes_since >= SESSION_TIMEOUT_MINUTES as f64 {
        let closed_ids = db.close_sessions()?;
        db.delete_guest_users_and_queue_for_sessions(&closed_ids)?;
        return start_session_if_needed(db);
    }
    db.update_admin_users_to_session(current.id)?;
    Ok(current)
}

pub fn add_session_log_with_gap(db: &Db, session_id: i64, song: &str) -> rusqlite::Result<()> {
    let last = db.get_last_session_log(session_id)?;
    if let Some(ref log) = last {
        let jdiff = minutes_since(&db.conn(), &log.timestamp);
        if jdiff < MIN_LOG_GAP_MINUTES as f64 {
            db.conn().execute("DELETE FROM session_log WHERE id = ?1", params![log.id])?;
        }
    }
    db.add_session_log(session_id, song)?;
    Ok(())
}
