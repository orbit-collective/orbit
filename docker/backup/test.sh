#!/bin/sh
# Regression tests for backup.sh, run against the built `backup` image.
#
#   sh docker/backup/test.sh      (or: make test-backup)
#
# The script builds its own image from this directory, so it always tests the
# current code and does not depend on the name Compose gives the service.
#
# Every case works on a throwaway copy of a tiny SQLite database in a temp
# directory; nothing touches database/database.sqlite or ./backup.

set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
IMAGE="${BACKUP_IMAGE:-orbit-backup-test}"
WORK="$(mktemp -d)"
FAILED=0
trap 'docker run --rm -v "$WORK:/w" --entrypoint sh "$IMAGE" -c "rm -rf /w/*" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

docker build -q -t "$IMAGE" "$HERE" >/dev/null || { echo "FAIL - could not build $IMAGE"; exit 1; }

pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; FAILED=1; }

new_case() {
    CASE="$WORK/$1"
    mkdir -p "$CASE/db" "$CASE/out"
    docker run --rm -v "$CASE/db:/db" --entrypoint sh "$IMAGE" -c \
        "sqlite3 /db/database.sqlite 'create table t(a); insert into t values (1);' && chmod 644 /db/database.sqlite && chown $(id -u):$(id -g) /db/database.sqlite" >/dev/null
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
#    and the scheduled loop keeps running. The test must also leave any other
#    container built from the same image (the real backup service) alone.
new_case daily
: > "$CASE/out/daily"   # a file where the daily directory should be
bystander="backup-test-bystander-$$"
docker run -d --name "$bystander" --entrypoint sleep "$IMAGE" 300 >/dev/null
runner="backup-test-runner-$$"
docker run -d --name "$runner" -v "$CASE/db:/data/database:ro" -v "$CASE/out:/backup" "$IMAGE" >/dev/null
sleep 5
log="$(docker logs "$runner" 2>&1)"
docker rm -f "$runner" >/dev/null 2>&1
if echo "$log" | grep -q "ERROR" && ! echo "$log" | grep -q "saved daily copy"; then
    pass "a failed daily copy is reported and not logged as saved"
else
    fail "a failed daily copy is reported and not logged as saved"
    echo "$log" | sed 's/^/       /'
fi
if [ "$(docker inspect -f '{{.State.Running}}' "$bystander" 2>/dev/null)" = "true" ]; then
    pass "the test leaves other containers built from the image running"
else
    fail "the test leaves other containers built from the image running"
fi
docker rm -f "$bystander" >/dev/null 2>&1

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

# 5. With no BACKUP_UID the service runs as the owner of the database file, so
#    a database only its owner can read (mode 0600) is still backed up, and the
#    snapshot belongs to that owner.
new_case restricted
docker run --rm -v "$CASE/db:/db" --entrypoint sh "$IMAGE" -c \
    "chown 4343:4343 /db/database.sqlite && chmod 600 /db/database.sqlite"
run_backup "$CASE" "$IMAGE" once >/dev/null 2>&1
snapshot="$(ls "$CASE"/out/orbit-*.sqlite 2>/dev/null | head -1)"
if [ -n "$snapshot" ] && [ "$(stat -c %u "$snapshot")" = "4343" ]; then
    pass "a database readable only by its owner is backed up, owned by that owner"
else
    fail "a database readable only by its owner is backed up, owned by that owner"
fi

# 6. Changing BACKUP_UID after backups exist hands the existing files and the
#    daily directory to the new user, so daily copies keep working.
new_case reowned
run_backup "$CASE" -e BACKUP_UID=4242 -e BACKUP_GID=4242 "$IMAGE" once >/dev/null 2>&1
as_root() {
    docker run --rm -v "$CASE/out:/o" --entrypoint sh "$IMAGE" -c "$1" 2>/dev/null
}
as_root 'rm -f /o/daily/orbit-*.sqlite'
run_backup "$CASE" -e BACKUP_UID=4545 -e BACKUP_GID=4545 "$IMAGE" once >/dev/null 2>&1
owner="$(as_root 'stat -c %u /o/daily')"
daily_files="$(as_root 'ls /o/daily' | grep -c '^orbit-')"
if [ "$owner" = "4545" ] && [ "$daily_files" = "1" ]; then
    pass "after BACKUP_UID changes the daily directory and copies belong to the new user"
else
    fail "after BACKUP_UID changes the daily directory and copies belong to the new user (owner=$owner, daily files=$daily_files)"
fi

# 7. A database owned by root must not make the script re-execute itself as
#    root forever; it runs once, as root, and finishes.
new_case rootdb
docker run --rm -v "$CASE/db:/db" --entrypoint sh "$IMAGE" -c "chown 0:0 /db/database.sqlite" >/dev/null
if timeout 40 docker run --rm -v "$CASE/db:/data/database:ro" -v "$CASE/out:/backup" "$IMAGE" once >/dev/null 2>&1 \
    && [ "$(ls "$CASE"/out/orbit-*.sqlite 2>/dev/null | wc -l | tr -d ' ')" = "1" ]; then
    pass "a root-owned database is backed up once and the script does not loop"
else
    fail "a root-owned database is backed up once and the script does not loop"
fi

exit $FAILED
