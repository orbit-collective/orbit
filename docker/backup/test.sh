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
