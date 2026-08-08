# syntax=docker/dockerfile:1

# =============================================================================
# Orbit — Laravel + Inertia + React monolith
# Two build targets from one Dockerfile:
#   * php  — the Laravel application (php artisan serve)
#   * node — the Vite dev server (npm run dev, HMR)
# docker-compose runs both as separate services sharing the mounted source.
# =============================================================================

# -----------------------------------------------------------------------------
# PHP / Laravel application
# -----------------------------------------------------------------------------
FROM php:8.5-cli AS php

# System libraries + PHP extensions required by Laravel and SQLite.
# pcov powers `make test-coverage` / `composer test-coverage` (code coverage
# gate) — it's cheap enough to keep enabled in every environment, unlike Xdebug.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libsqlite3-dev \
        libicu-dev \
        libonig-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_sqlite bcmath zip intl mbstring \
    && pecl install pcov \
    && docker-php-ext-enable pcov \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Composer (from the official Composer image).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Install PHP dependencies first for better layer caching. Skip scripts here
# because the application code (and artisan) isn't present yet.
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-interaction --prefer-dist --no-progress

# Now copy the rest of the source and finish the autoloader / package discovery.
COPY . .
RUN composer dump-autoload --optimize

# Entrypoint prepares runtime files and runs database migrations.
# Application configuration and secrets are provided through environment
# variables, e.g. by Doppler.

COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 8000
ENTRYPOINT ["entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]

# -----------------------------------------------------------------------------
# Node / Vite dev server
# -----------------------------------------------------------------------------
FROM node:26-alpine AS node
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: eslint-plugin-react's peer range (<=9.7) lags behind the
# project's eslint 10.x; npm's default strict peer resolution fails a clean
# `npm ci` over this even though the versions work fine together in practice.
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 5173
# --host makes Vite listen on 0.0.0.0 so it is reachable from the host browser.
CMD ["npm", "run", "dev", "--", "--host"]
