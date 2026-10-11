<?php

namespace App\Http\Middleware;

use App\Support\Sessions\SessionRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSessionLifetime
{
    public function __construct(private readonly SessionRegistry $sessionRegistry) {}

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

        $this->registerSession($request, $user->id);

        return $next($request);
    }

    /**
     * Lets the Security page list this session when the session store cannot
     * (everything but the database driver). Throttled: the list only shows the
     * time of the last activity, so a write per request would be wasted work.
     * A new session id (after login) is registered immediately.
     */
    private function registerSession(Request $request, int $userId): void
    {
        if (! $this->sessionRegistry->enabled()) {
            return;
        }

        $session = $request->session();
        $registered = $session->get('session_registry');

        if (
            is_array($registered)
            && $registered['id'] === $session->getId()
            && now()->getTimestamp() - $registered['at'] < SessionRegistry::TOUCH_INTERVAL
        ) {
            return;
        }

        $this->sessionRegistry->touch($userId, $session->getId(), $request->ip(), $request->userAgent());
        $session->put('session_registry', ['id' => $session->getId(), 'at' => now()->getTimestamp()]);
    }
}
