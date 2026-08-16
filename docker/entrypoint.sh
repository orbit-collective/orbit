#!/bin/sh

# Bootstraps the Laravel app on container start, then execs the given command.

set -e

cd /app

# Ensure the SQLite database file exists before migrating.

mkdir -p database

if [ ! -f database/database.sqlite ]; then
    touch database/database.sqlite
fi

# Clear cached Laravel configuration so the application reads
# the current environment variables provided by Doppler.

php artisan config:clear

# Apply database migrations.

php artisan migrate --force

exec "$@"
