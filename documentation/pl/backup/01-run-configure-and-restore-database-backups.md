# Uruchom, skonfiguruj i przywróć kopie zapasowe bazy

Przećwiczony przykład: wszystko o usłudze `backup`, od pierwszego `docker compose up` do przywrócenia snapshotu po awarii. Awaria, przed którą to chroni, jest prawdziwa: `migrate:fresh` uruchomione na złym pliku bazy kiedyś wyczyściło deweloperską bazę, która nie miała kopii.

## Krok 1 — Jak to działa

Usługa jest częścią zwykłego stosu, więc uruchamiają ją `make up`, `make up-d` i `make setup`. Sprawdź ją:

```bash
docker compose logs backup
```

Loguje jedną linię na snapshot, np. `saved orbit-20261006-180532-33dd003a.sqlite (1757184 bytes)`. Snapshot od razu zrobisz tak:

```bash
make backup-now
```

Healthcheck kontenera zmienia się na `unhealthy`, jeśli nie ma snapshotu młodszego niż dwa interwały.

## Krok 2 — Ustawienia

Wszystkie ustawienia to zmienne środowiskowe z wartościami domyślnymi, czytane przez `docker-compose.yml` (ustaw je w `.env`, w Doppler albo w powłoce):

| Zmienna | Domyślnie | Znaczenie |
| --- | --- | --- |
| `BACKUP_INTERVAL` | `3600` | Sekundy między snapshotami. |
| `BACKUP_KEEP` | `48` | Ile najnowszych snapshotów zostawić. |
| `BACKUP_KEEP_DAILY` | `30` | Ile kopii dziennych zostawić w `backup/daily/`. |
| `BACKUP_DIR` | `./backup` | Katalog hosta, do którego trafiają snapshoty. |
| `BACKUP_UID` / `BACKUP_GID` | właściciel `database.sqlite` | Użytkownik, jako którego działa usługa i który jest właścicielem snapshotów. Zostaw puste, by użyć właściciela pliku bazy; ustaw oba, by nadpisać. |

Plik: `docker-compose.yml`

```yaml
    backup:
        build:
            context: ./docker/backup

        # Starts as root only to chown the mounted directory, then runs as the
        # owner of database/database.sqlite so it can always read it and the
        # snapshots in ./backup belong to you. Set BACKUP_UID and BACKUP_GID to
        # override that.
        environment:
            BACKUP_UID: ${BACKUP_UID:-}
            BACKUP_GID: ${BACKUP_GID:-}
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

Snapshoty mają tryb `0600`, bo baza zawiera hashe haseł i tokeny. Katalog `./backup` jest ignorowany przez git (`.gitignore`):

```
/backup
```

## Krok 3 — Obraz kontenera

Plik: `docker/backup/Dockerfile`

```dockerfile
FROM alpine:3.21

RUN apk add --no-cache sqlite su-exec

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
```

## Krok 4 — Skrypt

Plik: `docker/backup/backup.sh`

Rzeczy, w których łatwo o błąd, a które są tu obsłużone:

- **Nigdy nie kopiuj działającego pliku SQLite przez `cp`.** `.backup` robi spójny snapshot podczas zapisów aplikacji.
- **Błędy muszą się propagować.** Pętla woła `backup_once || true`, żeby jeden nieudany przebieg nie zatrzymał harmonogramu, a to wyłącza `set -e` wewnątrz funkcji. Dlatego każdy krok, który może się nie udać, sprawdza własny wynik i zwraca niezerowy kod, zanim cokolwiek zostanie zalogowane jako zapisane albo przycięte.
- **Zapis atomowy.** Zarówno snapshot, jak i kopia dzienna są zapisywane pod tymczasową nazwą i przemianowywane, więc przerwany przebieg nie zostawi pliku wyglądającego na gotowy.
- **Unikalne nazwy.** Każda nazwa ma losowy sufiks, więc harmonogram i `make backup-now` mogą działać w tej samej sekundzie bez nadpisywania się.
- **Własność.** Brakujący katalog hosta tworzy Docker jako root, więc skrypt startuje jako root, robi `chown` na `/backup`, jego katalogu `daily/` i plikach `orbit-*.sqlite` w nich (i niczym więcej, bo `BACKUP_DIR` może zawierać inne dane), po czym uruchamia się ponownie przez `su-exec` jako docelowy użytkownik. Domyślnie jest to właściciel pliku bazy, który w kontenerze jest tylko do odczytu i może być czytelny tylko dla swojego właściciela, więc zawsze da się go odczytać, a snapshoty należą do osoby, do której należą dane. `BACKUP_DROPPED` zapobiega nieskończonemu ponownemu uruchamianiu się skryptu, gdy baza należy do roota. Makefile nie musi tworzyć katalogu.

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
#   created by Docker as root. It chowns /backup, its daily/ directory and the
#   orbit-*.sqlite files in them (nothing else, BACKUP_DIR may hold other data)
#   to the user it will run as, and drops to that user before touching any data.
#   That user is BACKUP_UID:BACKUP_GID when set, otherwise the owner of the
#   database file, so a database only its owner can read is still backed up and
#   the snapshots belong to the person who owns the data.
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
RUN_UID="${BACKUP_UID:-}"
RUN_GID="${BACKUP_GID:-}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [backup] $*"
}

# BACKUP_DROPPED stops a database owned by root (uid 0) from re-executing as
# root forever: the script only drops privileges once.
if [ "$(id -u)" = "0" ] && [ -z "${BACKUP_DROPPED:-}" ]; then
    # The database is mounted read-only and may be readable only by its owner,
    # so by default run as that owner.
    if [ -z "$RUN_UID" ]; then
        RUN_UID="$(stat -c %u "$DB" 2>/dev/null || echo 1000)"
    fi
    if [ -z "$RUN_GID" ]; then
        RUN_GID="$(stat -c %g "$DB" 2>/dev/null || echo 1000)"
    fi

    mkdir -p "$DEST"
    chown "$RUN_UID:$RUN_GID" "$DEST"
    if [ -d "$DEST/daily" ]; then
        chown "$RUN_UID:$RUN_GID" "$DEST/daily"
    fi
    # Snapshots written under a previous BACKUP_UID, so the new user can prune them.
    find "$DEST" -maxdepth 2 -name 'orbit-*.sqlite' -exec chown "$RUN_UID:$RUN_GID" {} +
    BACKUP_DROPPED=1 exec su-exec "$RUN_UID:$RUN_GID" "$0" "$@"
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

## Krok 5 — Targety Make

Plik: `Makefile`

```make
# Take a database snapshot right now (the backup service also does this on a timer).

backup-now: ensure-env
	$(COMPOSE) run --rm backup once

# Regression tests for the backup script (builds the image, runs it on throwaway copies).

test-backup:
	sh docker/backup/test.sh
```

## Krok 6 — Przywróć snapshot

Przywrócenie to położenie snapshotu z powrotem w `database/database.sqlite`. **Nigdy nie używaj do tego `migrate:fresh`**; kasuje wszystkie tabele.

1. Zatrzymaj stos, żeby nic nie pisało do pliku: `make down`.
2. Zachowaj obecny plik na wypadek błędnego przywrócenia: `cp database/database.sqlite /tmp/database.before-restore.sqlite`.
3. Wybierz snapshot. Najnowsze najpierw: `ls -1t backup/orbit-*.sqlite | head`. Konkretny dzień: `ls backup/daily/`.
4. Sprawdź, że się otwiera: `sqlite3 -readonly backup/orbit-<stamp>.sqlite 'PRAGMA integrity_check; SELECT count(*) FROM issues;'`.
5. Skopiuj go na miejsce: `cp backup/orbit-<stamp>.sqlite database/database.sqlite`.
6. Uruchom stos i zastosuj migracje nowsze niż snapshot: `make up-d && make migrate`. Snapshot sprzed wydania po prostu nie ma migracji tego wydania; `migrate` je dodaje i zachowuje dane.

Znaczniki czasu w nazwach snapshotów są w UTC, czyli według zegara kontenera.

## Krok 7 — Trzymaj kopie poza dyskiem projektu

Snapshoty obok projektu nie przetrwają utraty dysku. Wskaż `BACKUP_DIR` na inny dysk:

```bash
BACKUP_DIR=/run/media/you/Backup/orbit-db
```

Katalog musi istnieć na hoście, a dysk musi być zamontowany do odczytu i zapisu. Dysk NTFS, którego Windows nie zamknął poprawnie, jest montowany przez Linuksa tylko do odczytu (`volume is dirty`), a kontener nie może wtedy pisać; dysk ext4 lub btrfs unika tej klasy problemów.

## Testy

Nie ma testów PHP ani Vitest, bo usługa to skrypt powłoki w kontenerze. `docker/backup/test.sh` uruchamia przypadki regresyjne skryptu na zbudowanym obrazie, na tymczasowych kopiach małej bazy, i nigdy nie dotyka `database/database.sqlite` ani `./backup`:

```bash
make test-backup
```

- Katalog hosta, do którego użytkownik kontenera nie może pisać (należący do roota, tak jak tworzy go Docker dla brakującego montowania), nadal działa, a snapshot należy do `BACKUP_UID`.
- Dwa backupy uruchomione w tej samej sekundzie dają dwa snapshoty i żadnych pozostałych plików tymczasowych.
- Nieudana kopia dzienna jest raportowana jako błąd i nigdy nie jest logowana jako zapisana, a test zostawia w spokoju inne kontenery zbudowane z tego samego obrazu (prawdziwą usługę backupu).
- Zakończony przebieg zostawia tylko całe pliki, a kopia dzienna przechodzi `integrity_check`.
- Baza czytelna tylko dla właściciela jest kopiowana, a snapshot należy do tego właściciela.
- Po zmianie `BACKUP_UID` katalog `daily/` i istniejące snapshoty należą do nowego użytkownika.
- Baza należąca do roota jest kopiowana raz i skrypt nie wpada w pętlę.

Skrypt buduje własny obraz z `docker/backup/`, więc zawsze testuje bieżący kod i nie zależy od nazwy, jaką Compose nadaje usłudze.

Plik: `docker/backup/test.sh`

```sh
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
```
