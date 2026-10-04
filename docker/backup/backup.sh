#!/bin/sh
# Periodically snapshots Orbit's SQLite database into /backup.
#
# - Uses `sqlite3 .backup`, which takes a consistent snapshot even while
#   the app is writing (a plain `cp` of a live database can be torn).
# - Opens the source read-only; the compose service also mounts it :ro, so
#   this container can never modify the live database.
# - Every snapshot is verified with PRAGMA integrity_check and written
#   atomically (temp file + rename), so /backup never holds a half-written file.
# - Keeps the newest BACKUP_KEEP snapshots plus one per day for
#   BACKUP_KEEP_DAILY days (in /backup/daily), so a bad state - e.g. an
#   accidentally wiped database - cannot rotate every good copy away within hours.
#
# Usage: backup.sh          run forever, one snapshot every BACKUP_INTERVAL seconds
#        backup.sh once     take a single snapshot and exit (used by `make backup-now`)

set -eu
umask 077

DB="${BACKUP_DB:-/data/database/database.sqlite}"
DEST="${BACKUP_DIR:-/backup}"
INTERVAL="${BACKUP_INTERVAL:-3600}"
KEEP="${BACKUP_KEEP:-48}"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-30}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [backup] $*"
}

prune() {
    # $1 directory, $2 how many newest files to keep
    ls -1t "$1"/orbit-*.sqlite 2>/dev/null | tail -n +"$(($2 + 1))" | while read -r old; do
        rm -f "$old"
        log "pruned $(basename "$old")"
    done
}

backup_once() {
    if [ ! -f "$DB" ]; then
        log "ERROR: database not found at $DB"
        return 1
    fi

    stamp="$(date +%Y%m%d-%H%M%S)"
    tmp="$DEST/.tmp-$stamp.sqlite"
    final="$DEST/orbit-$stamp.sqlite"

    if ! sqlite3 -readonly "$DB" ".timeout 15000" ".backup '$tmp'"; then
        rm -f "$tmp"
        log "ERROR: sqlite3 .backup failed"
        return 1
    fi

    if [ "$(sqlite3 -readonly "$tmp" 'PRAGMA integrity_check;')" != "ok" ]; then
        rm -f "$tmp"
        log "ERROR: snapshot failed integrity_check, discarded"
        return 1
    fi

    mv "$tmp" "$final"
    log "saved $(basename "$final") ($(wc -c < "$final") bytes)"

    mkdir -p "$DEST/daily"
    day="$(date +%Y%m%d)"
    if ! ls "$DEST/daily"/orbit-"$day"-*.sqlite >/dev/null 2>&1; then
        cp "$final" "$DEST/daily/$(basename "$final")"
        log "saved daily copy for $day"
    fi

    prune "$DEST" "$KEEP"
    prune "$DEST/daily" "$KEEP_DAILY"
}

if ! touch "$DEST/.write-test" 2>/dev/null; then
    log "ERROR: $DEST is not writable by uid $(id -u). Create the host directory first (make backup-now does this)."
    exit 1
fi
rm -f "$DEST/.write-test"

if [ "${1:-}" = "once" ]; then
    backup_once
    exit $?
fi

log "watching $DB every ${INTERVAL}s, keeping $KEEP snapshots + $KEEP_DAILY daily"
while true; do
    backup_once || true
    sleep "$INTERVAL"
done
