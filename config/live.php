<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Live updates
    |--------------------------------------------------------------------------
    |
    | Real-time updates run on Laravel Reverb. They are on only when the
    | default broadcaster really is Reverb (see config/broadcasting.php, which
    | downgrades it to `null` while the REVERB_* credentials are missing).
    | Everything else keeps working without them.
    |
    */

    'enabled' => env('BROADCAST_CONNECTION') === 'reverb'
        && filled(env('REVERB_APP_KEY'))
        && filled(env('REVERB_APP_SECRET'))
        && filled(env('REVERB_APP_ID'))
        && filled(env('REVERB_HOST')),

    /*
    |--------------------------------------------------------------------------
    | Browser connection
    |--------------------------------------------------------------------------
    |
    | Handed to the page at runtime through the shared Inertia props, so
    | nothing is baked into the Vite build and Doppler stays the only place to
    | configure it. These are the *public* endpoint the browser opens
    | (REVERB_PUBLIC_*, e.g. wss://ws.example.com:443); REVERB_HOST/PORT/SCHEME
    | are the internal endpoint the app and queue workers publish to. Only the
    | public key is exposed, never the secret.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Fallback polling
    |--------------------------------------------------------------------------
    |
    | Without Reverb - or while the socket is down - an open page re-reads the
    | props it shows every LIVE_POLL_INTERVAL seconds (visible tabs only, with
    | jitter). 0 turns polling off, leaving the app as it was before live
    | updates. Anything below 10 seconds is raised to 10.
    |
    */

    'poll_interval' => (static function (): int {
        $seconds = (int) env('LIVE_POLL_INTERVAL', 30);

        return $seconds <= 0 ? 0 : max(10, $seconds);
    })(),

    'client' => [
        'key' => env('REVERB_APP_KEY'),
        'host' => env('REVERB_PUBLIC_HOST', env('REVERB_HOST')),
        'port' => (int) env('REVERB_PUBLIC_PORT', env('REVERB_PORT', 443)),
        'scheme' => env('REVERB_PUBLIC_SCHEME', env('REVERB_SCHEME', 'https')),
    ],

];
