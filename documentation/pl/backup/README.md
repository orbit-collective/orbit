# Kopie zapasowe bazy danych

Bazę SQLite Orbita (`database/database.sqlite`) kopiuje mały kontener `backup` w stosie Dockera. W zadanym odstępie robi spójny snapshot, weryfikuje go, trzyma kroczący zestaw plus jedną kopię na dzień i zapisuje wszystko do `./backup` (albo tam, gdzie wskazuje `BACKUP_DIR`). Kopiuje **wyłącznie plik bazy**; wgrane załączniki i `.env` nie są objęte.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Uruchom, skonfiguruj i przywróć kopie zapasowe bazy](./01-run-configure-and-restore-database-backups.md)** — cała usługa od początku do końca: jak powstaje i jest weryfikowany snapshot, ustawienia, które nim sterują, jak działa własność plików, jak przywrócić snapshot niczego nie kasując, jak trzymać kopie na innym dysku oraz testy regresyjne skryptu.

## Architektura w jednym akapicie

Usługa `backup` (`docker/backup/`) to obraz Alpine z `sqlite3` i `su-exec`. Jej skrypt (`backup.sh`) działa w pętli albo jednorazowo przez `backup.sh once` (tego używa `make backup-now`). Każde uruchomienie wykonuje `sqlite3 -readonly <db> ".backup <tmp>"`, co daje spójną kopię nawet przy zapisach aplikacji, sprawdza ją przez `PRAGMA integrity_check` i zmienia nazwę na docelową, więc `/backup` nigdy nie zawiera pliku zapisanego do połowy. Katalog z bazą jest zamontowany w kontenerze tylko do odczytu, więc usługa nie może zmienić działającej bazy. Zostaje `BACKUP_KEEP` najnowszych snapshotów, plus jeden na dzień przez `BACKUP_KEEP_DAILY` dni w `backup/daily/`, więc zły stan (np. przypadkowo wyczyszczona baza) nie wypchnie w ciągu godzin wszystkich dobrych kopii. Kontener startuje jako root tylko po to, by zrobić `chown` zamontowanego katalogu, a przed dotknięciem danych przechodzi na `BACKUP_UID:BACKUP_GID`.
