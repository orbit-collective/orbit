<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /** The languages the interface is translated into. */
    public const SUPPORTED = ['en', 'pl'];

    /**
     * Server-side texts (validation errors, flash messages) follow the
     * language the user picked in the browser: the frontend keeps it in the
     * plain `locale` cookie (see `utils/locale.ts`, excluded from cookie
     * encryption in `bootstrap/app.php`), which also works for guests. The
     * session value set by `locale.update` is the fallback.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->cookie('locale')
            ?? Session::get('locale', config('app.locale'));

        if (in_array($locale, self::SUPPORTED, true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
