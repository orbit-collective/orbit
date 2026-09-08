<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected ActivityLogService $activityLogService
    ) {}
    public function index(): Collection
    {
        return $this->notificationService->getAllForUser(auth()->id());
    }

    public function update(Request $request, Notification $notification): RedirectResponse
    {
        abort_if($notification->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'type' => 'required|in:success,info,warning,error',
            'title' => 'required|string',
            'message' => 'required|string',
            'read' => 'boolean',
            'action_url' => 'nullable|string'
        ]);

        $this->notificationService->update($notification, $validated);
        return redirect()->back();
    }

    public function destroy(Notification $notification): RedirectResponse
    {
        abort_if($notification->user_id !== auth()->id(), 403);

        $this->activityLogService->log(null, "Notification #$notification->id deleted by " . auth()->user()?->name ?? 'Someone', auth()->id());

        $notification->delete();

        return redirect()->back();
    }

    public function markAllAsRead(): RedirectResponse
    {
        $this->notificationService->markAllAsReadForUser(auth()->id());

        return redirect()->back();
    }
}
