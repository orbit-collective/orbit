<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSessionLifetime
{
    /**
     * Force-logout the user once they've been idle longer than their
     * configured session lifetime (users.session_lifetime, in minutes).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $lastActivityAt = $request->session()->get('last_activity_at');

        if ($lastActivityAt && Carbon::parse($lastActivityAt)->addMinutes($user->session_lifetime)->isPast()) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('warning', 'You have been signed out due to inactivity.');
        }

        $request->session()->put('last_activity_at', now());

        return $next($request);
    }
}
