<?php

use App\Http\Middleware\EnforceSessionLifetime;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Sentry\Laravel\Integration;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            EnforceSessionLifetime::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Inertia's client shows a full-page reload of Laravel's own 403 HTML
        // whenever a request it made gets a non-Inertia error response back.
        // For requests actually coming from the app (identified by the
        // X-Inertia header Inertia's client sets on every visit), redirect
        // back with a flash error instead — AlertContext on the frontend
        // already surfaces `flash.error` as a toast, the same way it does
        // for validation failures.
        //
        // A policy denial throws Illuminate\Auth\Access\AuthorizationException,
        // but the handler's prepareException() step (which runs before render
        // callbacks are consulted) converts that into this Symfony exception
        // before we ever see it, carrying the original message along.
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if (! $request->hasHeader('X-Inertia')) {
                return null;
            }

            return redirect()->back()->with(
                'error',
                $e->getMessage() ?: 'This action is unauthorized.',
            );
        });

        Integration::handles($exceptions);
    })->create();
