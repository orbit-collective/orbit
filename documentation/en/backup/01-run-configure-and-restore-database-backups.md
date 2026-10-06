# Run, configure and restore database backups

Worked example: everything about the `backup` service, from the first `docker compose up` to restoring a snapshot after a disaster. The failure this exists for is real: a `migrate:fresh` run against the wrong database file once wiped a development database that had no copy.

## Step 1 — How it runs

The service is part of the normal stack, so `make up`, `make up-d` and `make setup` start it. Check it with:

```bash
docker compose logs backup
```

It logs one line per snapshot, for example `saved orbit-20261006-180532-33dd003a.sqlite (1757184 bytes)`. Take a snapshot right now with:

```bash
make backup-now
```

The container's health check turns `unhealthy` if no snapshot newer than two intervals exists.

## Step 2 — Settings

All settings are environment variables with defaults, read by `docker-compose.yml` (set them in `.env`, in Doppler, or in your shell):

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_INTERVAL` | `3600` | Seconds between snapshots. |
| `BACKUP_KEEP` | `48` | How many of the newest snapshots to keep. |
| `BACKUP_KEEP_DAILY` | `30` | How many daily copies to keep in `backup/daily/`. |
| `BACKUP_DIR` | `./backup` | Host directory the snapshots are written to. |
| `BACKUP_UID` / `BACKUP_GID` | `1000` / `1000` | Owner of the snapshots. Set both to your host user's ids if they are not 1000 (`id -u`, `id -g`). |

File: `docker-compose.yml`

```yaml
    backup:
        build:
            context: ./docker/backup

        # Starts as root only to chown the mounted directory, then runs as this
        # uid/gid (set both to your host user's if it is not 1000) so snapshots
        # in ./backup belong to you, not root.
        environment:
            BACKUP_UID: ${BACKUP_UID:-1000}
            BACKUP_GID: ${BACKUP_GID:-1000}
            BACKUP_INTERVAL: ${BACKUP_INTERVAL:-3600}
            BACKUP_KEEP: ${BACKUP_KEEP:-48}
            BACKUP_KEEP_DAILY: ${BACKUP_KEEP_DAILY:-30}

        volumes:
            # Read-only: the backup container can never modify the live database.
            - ./database:/data/database:ro

            # Point BACKUP_DIR at another drive to keep snapshots off this disk.
            - ${BACKUP_DIR:-./backup}:/backup

        healthcheck:
            test: ["CMD-SHELL", "find /backup -maxdepth 1 -name 'orbit-*.sqlite' -mmin -$$((2 * ${BACKUP_INTERVAL:-3600} / 60 + 1)) | grep -q ."]
            interval: 5m
            start_period: 2m

        restart: unless-stopped

        networks:
            - orbit-network
```

Snapshots are created with mode `0600` because the database holds password hashes and tokens. The `./backup` directory is git-ignored (`.gitignore`):

```
/backup
```

## Step 3 — The container image

File: `docker/backup/Dockerfile`

```dockerfile
FROM alpine:3.21

RUN apk add --no-cache sqlite su-exec

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
```

## Step 4 — The script

File: `docker/backup/backup.sh`

The things that are easy to get wrong, all handled here:

- **Never copy a live SQLite file with `cp`.** `.backup` takes a consistent snapshot while the app writes.
- **Failures must propagate.** The loop calls `backup_once || true` so one failed run does not stop the schedule, and that disables `set -e` inside the function. Every step that can fail therefore checks its own result and returns non-zero before anything is logged as saved or pruned.
- **Atomic writes.** Both the snapshot and the daily copy are written under a temp name and renamed, so an interrupted run can never leave a file that looks finished.
- **Unique names.** Each name carries a random suffix, so the schedule and `make backup-now` can run in the same second without overwriting each other.
- **Ownership.** A missing host directory is created by Docker as root, and the host user is not always uid 1000, so the script starts as root, `chown`s `/backup` to `BACKUP_UID:BACKUP_GID`, and re-executes itself through `su-exec` as that user. The Makefile therefore does not need to create the directory.

```sh
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
```

## Step 5 — Make targets

File: `Makefile`

```make
# Take a database snapshot right now (the backup service also does this on a timer).

backup-now: ensure-env
	$(COMPOSE) run --rm backup once

# Regression tests for the backup script (builds the image, runs it on throwaway copies).

test-backup:
	$(COMPOSE) build backup
	sh docker/backup/test.sh
```

## Step 6 — Restore a snapshot

Restoring means putting a snapshot back at `database/database.sqlite`. **Never use `migrate:fresh` for this**; it drops every table.

1. Stop the stack so nothing writes to the file: `make down`.
2. Keep the current file in case the restore is wrong: `cp database/database.sqlite /tmp/database.before-restore.sqlite`.
3. Choose a snapshot. Newest first: `ls -1t backup/orbit-*.sqlite | head`. A specific day: `ls backup/daily/`.
4. Check it opens: `sqlite3 -readonly backup/orbit-<stamp>.sqlite 'PRAGMA integrity_check; SELECT count(*) FROM issues;'`.
5. Copy it into place: `cp backup/orbit-<stamp>.sqlite database/database.sqlite`.
6. Start the stack and apply any migrations newer than the snapshot: `make up-d && make migrate`. A snapshot taken before a release simply lacks that release's migrations; `migrate` adds them and keeps the data.

Snapshot timestamps in file names are UTC, the container's clock.

## Step 7 — Keep the copies off the project disk

Snapshots next to the project do not survive losing the disk. Point `BACKUP_DIR` at another drive:

```bash
BACKUP_DIR=/run/media/you/Backup/orbit-db
```

The directory must exist on the host and the drive must be mounted read-write. An NTFS drive that Windows did not close cleanly is mounted read-only by Linux (`volume is dirty`), and the container then cannot write; an ext4 or btrfs drive avoids that class of problem.

## Tests

There are no PHP or Vitest tests, because the service is a shell script in a container. `docker/backup/test.sh` runs the script's regression cases against the built image on throwaway copies of a small database, and never touches `database/database.sqlite` or `./backup`:

```bash
make test-backup
```

- A host directory the container user cannot write (root-owned, as Docker creates a missing mount) still works, and the snapshot ends up owned by `BACKUP_UID`.
- Two backups started in the same second produce two snapshots and no leftover temp files.
- A failing daily copy is reported as an error and never logged as saved.
- A finished run leaves only whole files, and the daily copy passes `integrity_check`.

File: `docker/backup/test.sh`

```sh
#!/bin/sh
# Regression tests for backup.sh, run against the built `backup` image.
#
#   docker compose build backup && sh docker/backup/test.sh      (or: make test-backup)
#
# Every case works on a throwaway copy of a tiny SQLite database in a temp
# directory; nothing touches database/database.sqlite or ./backup.

set -u

IMAGE="${BACKUP_IMAGE:-orbit-backup}"
WORK="$(mktemp -d)"
FAILED=0
trap 'docker run --rm -v "$WORK:/w" --entrypoint sh "$IMAGE" -c "rm -rf /w/*" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; FAILED=1; }

new_case() {
    CASE="$WORK/$1"
    mkdir -p "$CASE/db" "$CASE/out"
    docker run --rm -v "$CASE/db:/db" --entrypoint sh "$IMAGE" -c \
        "sqlite3 /db/database.sqlite 'create table t(a); insert into t values (1);' && chmod 644 /db/database.sqlite" >/dev/null
}

run_backup() {
    # $1 = case dir, rest = extra docker args / command
    dir="$1"
    shift
    docker run --rm -v "$dir/db:/data/database:ro" -v "$dir/out:/backup" "$@"
}

# 1. A host directory the container user cannot write (root-owned, as Docker
#    creates a missing bind mount) still works, and the files end up owned by
#    BACKUP_UID rather than root.
new_case owner
chmod 755 "$CASE/out"
run_backup "$CASE" -e BACKUP_UID=4242 -e BACKUP_GID=4242 "$IMAGE" once >/dev/null 2>&1
snapshot="$(ls "$CASE"/out/orbit-*.sqlite 2>/dev/null | head -1)"
if [ -n "$snapshot" ] && [ "$(stat -c %u "$snapshot")" = "4242" ]; then
    pass "snapshot is written and owned by BACKUP_UID when the directory was not writable for it"
else
    fail "snapshot is written and owned by BACKUP_UID when the directory was not writable for it"
fi

# 2. Two backups started in the same second (the schedule plus
#    `make backup-now`) must each keep their own complete snapshot.
new_case parallel
run_backup "$CASE" -e BACKUP_KEEP=10 "$IMAGE" once >/dev/null 2>&1 &
first=$!
run_backup "$CASE" -e BACKUP_KEEP=10 "$IMAGE" once >/dev/null 2>&1 &
second=$!
wait $first
wait $second
count="$(ls "$CASE"/out/orbit-*.sqlite 2>/dev/null | wc -l | tr -d ' ')"
leftovers="$(ls -A "$CASE"/out | grep -c '^\.tmp' || true)"
if [ "$count" = "2" ] && [ "$leftovers" = "0" ]; then
    pass "two simultaneous backups produce two snapshots and leave no temp files"
else
    fail "two simultaneous backups produce two snapshots and leave no temp files (snapshots=$count, temp files=$leftovers)"
fi

# 3. A failing daily copy is reported as a failure, never logged as saved,
#    and the scheduled loop keeps running.
new_case daily
: > "$CASE/out/daily"   # a file where the daily directory should be
log="$(run_backup "$CASE" "$IMAGE" 2>&1 &
    pid=$!
    sleep 5
    docker ps -q --filter "ancestor=$IMAGE" | xargs -r docker stop >/dev/null 2>&1
    wait $pid 2>/dev/null)"
if echo "$log" | grep -q "ERROR" && ! echo "$log" | grep -q "saved daily copy"; then
    pass "a failed daily copy is reported and not logged as saved"
else
    fail "a failed daily copy is reported and not logged as saved"
    echo "$log" | sed 's/^/       /'
fi

# 4. A completed run leaves only whole files: no temp files, and the daily
#    copy passes integrity_check.
new_case atomic
run_backup "$CASE" "$IMAGE" once >/dev/null 2>&1
daily="$(ls "$CASE"/out/daily/orbit-*.sqlite 2>/dev/null | head -1)"
leftovers="$(ls -A "$CASE"/out "$CASE"/out/daily 2>/dev/null | grep -c '\.tmp' || true)"
check="$(docker run --rm -v "$CASE/out:/o:ro" --entrypoint sh "$IMAGE" -c \
    "sqlite3 -readonly /o/daily/$(basename "$daily") 'pragma integrity_check;'" 2>/dev/null)"
if [ -n "$daily" ] && [ "$check" = "ok" ] && [ "$leftovers" = "0" ]; then
    pass "daily copy is complete and no temp files remain"
else
    fail "daily copy is complete and no temp files remain"
fi

exit $FAILED
```
