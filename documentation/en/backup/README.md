# Database backups

Orbit's SQLite database (`database/database.sqlite`) is backed up by a small `backup` container in the Docker stack. It takes a consistent snapshot on an interval, verifies it, keeps a rolling set plus one copy per day, and writes everything to `./backup` (or wherever `BACKUP_DIR` points). It backs up **the database file only**; uploaded attachments and `.env` are not included.

## Guides, in the order you'd actually need them

1. **[Run, configure and restore database backups](./01-run-configure-and-restore-database-backups.md)** — the service end to end: how a snapshot is taken and verified, the settings that control it, how file ownership works, how to restore a snapshot without wiping anything, how to keep copies on another drive, and the regression tests for the script.

## The architecture in one paragraph

The `backup` service (`docker/backup/`) is an Alpine image with `sqlite3` and `su-exec`. Its script (`backup.sh`) runs forever, or once with `backup.sh once` (what `make backup-now` uses). Each run executes `sqlite3 -readonly <db> ".backup <tmp>"`, which produces a consistent copy even while the app writes, checks it with `PRAGMA integrity_check`, and renames it into place, so `/backup` never contains a half-written file. The database directory is mounted read-only into the container, so the service cannot change the live database. The newest `BACKUP_KEEP` snapshots are kept, plus one per day for `BACKUP_KEEP_DAILY` days under `backup/daily/`, so a bad state (for example an accidentally wiped database) cannot rotate every good copy away within hours. The container starts as root only to `chown` the mounted directory, then drops to `BACKUP_UID:BACKUP_GID` before touching any data.
