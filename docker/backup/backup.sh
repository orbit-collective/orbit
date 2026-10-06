#!/bin/sh
# Periodically snapshots Orbit's SQLite database into /backup.
#
# - Uses `sqlite3 .backup`, which takes a consistent snapshot even while
#   the app is writing (a plain `cp` of a live database can be torn).
# - Opens the source read-only; the compose service also mounts it :ro, so
#   this container can never modify the live database.
# - Every snapshot is verified with PRAGMA integrity_check and written
#   atomically (temp file + rename), so /backup never holds a half-written file.
#   Names carry a random suffix, so the schedule and `make backup-now` can run
#   in the same second without touching each other's files.
# - Keeps the newest BACKUP_KEEP snapshots plus one per day for
#   BACKUP_KEEP_DAILY days (in /backup/daily), so a bad state - e.g. an
#   accidentally wiped database - cannot rotate every good copy away within hours.
# - Starts as root only to make /backup writable: a missing host directory is
#   created by Docker as root, and the host user's uid is not always 1000. It
#   chowns /backup to BACKUP_UID:BACKUP_GID and drops to that user before
#   touching any data.
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
RUN_UID="${BACKUP_UID:-1000}"
RUN_GID="${BACKUP_GID:-1000}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [backup] $*"
}

if [ "$(id -u)" = "0" ]; then
    mkdir -p "$DEST"
    chown "$RUN_UID:$RUN_GID" "$DEST"
    exec su-exec "$RUN_UID:$RUN_GID" "$0" "$@"
fi

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

    # Called as `backup_once || true` by the schedule, which switches `set -e`
    # off inside this function, so every step that can fail is checked here.
    stamp="$(date +%Y%m%d-%H%M%S)-$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')"
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

    if ! mv "$tmp" "$final"; then
        rm -f "$tmp"
        log "ERROR: could not store the snapshot as $(basename "$final")"
        return 1
    fi
    log "saved $(basename "$final") ($(wc -c < "$final") bytes)"

    if ! mkdir -p "$DEST/daily"; then
        log "ERROR: could not create $DEST/daily, skipping the daily copy and pruning"
        return 1
    fi

    day="$(date +%Y%m%d)"
    if ! ls "$DEST/daily"/orbit-"$day"-*.sqlite >/dev/null 2>&1; then
        daily_tmp="$DEST/daily/.tmp-$stamp.sqlite"

        # Copied under a temp name and renamed, so an interrupted copy can
        # never be mistaken for today's finished daily snapshot.
        if ! cp "$final" "$daily_tmp" || ! mv "$daily_tmp" "$DEST/daily/$(basename "$final")"; then
            rm -f "$daily_tmp"
            log "ERROR: could not write the daily copy for $day, skipping pruning"
            return 1
        fi
        log "saved daily copy for $day"
    fi

    prune "$DEST" "$KEEP"
    prune "$DEST/daily" "$KEEP_DAILY"
}

if ! touch "$DEST/.write-test" 2>/dev/null; then
    log "ERROR: $DEST is not writable by uid $(id -u)."
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
