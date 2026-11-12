<?php

namespace App\Support;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Renders the React error page (`Errors/Error`) for the HTTP errors a person
 * can run into: 403, 404, 500 and 503.
 */
class ErrorPage
{
    public const STATUSES = [403, 404, 500, 503];

    /** Describe the original body, which the page replaces. */
    private const BODY_HEADERS = ['content-type', 'content-length', 'content-encoding', 'transfer-encoding'];

    /**
     * The page for the given response, or null to keep Laravel's own answer:
     * a status the page does not cover, a JSON response, or a crash page the
     * developer needs in debug mode.
     */
    public static function render(Request $request, Response $response): ?Response
    {
        $status = $response->getStatusCode();

        if (! in_array($status, self::STATUSES, true) || $response instanceof JsonResponse || $request->expectsJson()) {
            return null;
        }

        if ($status === 500 && config('app.debug')) {
            return null;
        }

        $page = fn (Request $request) => Inertia::render('Errors/Error', [
            'status' => $status,
            'path' => '/'.ltrim($request->path(), '/'),
        ])->toResponse($request)->setStatusCode($status);

        // Maintenance mode (and any other error thrown before the web group)
        // answers without a session, and the shared `flash` props read one.
        // An empty in-memory session makes them resolve to null.
        if (! $request->hasSession()) {
            $request->setLaravelSession(app('session')->driver('array'));
        }

        try {
            // An error can be thrown before (or without) the web middleware
            // group, so share the props the app shell reads (`auth`, ...) here.
            $page = app(HandleInertiaRequests::class)->handle($request, $page);
        } catch (Throwable) {
            // The error may be the very reason the shared props cannot be
            // built (a database outage): fall back to Laravel's page.
            return null;
        }

        return self::keepHeaders($response, $page);
    }

    /**
     * Carries the headers of the original error (`Retry-After` of a 503, for
     * one) over to the page. The page keeps its own body headers, cache headers
     * and Inertia headers.
     */
    private static function keepHeaders(Response $original, Response $page): Response
    {
        foreach ($original->headers->allPreserveCaseWithoutCookies() as $name => $values) {
            if (! in_array(strtolower($name), self::BODY_HEADERS, true) && ! $page->headers->has($name)) {
                $page->headers->set($name, $values);
            }
        }

        return $page;
    }
}
