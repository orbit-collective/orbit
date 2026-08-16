<?php

namespace App\Http\Middleware;

use App\Services\NotificationService;
use App\Services\ProjectService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function __construct(
        protected NotificationService $notificationService,
        protected ProjectService $projectService
    ) {}

    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'avatar' => $request->user()->avatar,
                    'role' => $request->user()->role->value,
                    'has_completed_onboarding' => $request->user()->has_completed_onboarding,
                    'has_completed_project_onboarding' => $request->user()->has_completed_project_onboarding,
                    'session_lifetime' => $request->user()->session_lifetime,
                ] : null,
            ],
            'hasProjects' => fn () => $request->user()
                ? $this->projectService->hasAnyProjects()
                : true,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'information' => fn () => $request->session()->get('information'),
                'action_url' => fn () => $request->session()->get('action_url'),
            ],
            'notifications' => fn () => $request->user()
                ? $this->notificationService->getAllForUser($request->user()->id)
                : [],
        ];
    }
}
