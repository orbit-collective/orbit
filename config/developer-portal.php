<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Developer Portal
    |--------------------------------------------------------------------------
    |
    | Settings → Developer Portal shows instance-wide diagnostics (Docker
    | containers, recent errors, every user and project), so it exists only on
    | a local development instance: it is on when APP_ENV is exactly `local`
    | (from `.env` or Doppler) and off for everything else - production, prod,
    | staging, testing. There is deliberately no separate switch to turn it on
    | elsewhere. On top of that, a user needs the `developer.portal.view`
    | permission (see DeveloperPortalAccessService).
    |
    */

    'enabled' => env('APP_ENV', 'production') === 'local',

    /*
    |--------------------------------------------------------------------------
    | Docker
    |--------------------------------------------------------------------------
    |
    | Container uptime is read from the Docker Engine API over its Unix
    | socket (mounted read-only into the `app` service). Only containers of
    | this Compose project are listed.
    |
    */

    'docker' => [
        'socket' => env('DEVELOPER_PORTAL_DOCKER_SOCKET', '/var/run/docker.sock'),
        'project' => env('DEVELOPER_PORTAL_COMPOSE_PROJECT', 'orbit'),
        'timeout' => 2,
    ],

    /*
    |--------------------------------------------------------------------------
    | Errors and lists
    |--------------------------------------------------------------------------
    */

    'errors' => [
        // Newest entries shown, and how much of the log's tail is scanned for them.
        'limit' => 50,
        'tail_bytes' => 512 * 1024,
    ],

    'per_page' => 10,

];
