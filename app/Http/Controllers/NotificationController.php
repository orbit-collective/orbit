<?php

namespace App\Http\Controllers;

use App\Http\Requests\Notifications\BulkNotificationsRequest;
use App\Http\Requests\Notifications\ListNotificationsRequest;
use App\Models\Notification;
use App\Repositories\NotificationRepository;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected ActivityLogService $activityLogService
    ) {}

    /**
     * One page of the popup's infinite scroll as JSON (not an Inertia page):
     * `before` is the last id the client has, the filters narrow the inbox.
     */
    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $userId = $request->user()->id;

        $page = $this->notificationService->pageForUser(
            $userId,
            $request->filters(),
            $request->integer('before') ?: null,
            $request->integer('per_page') ?: NotificationRepository::PER_PAGE,
        );

        return response()->json([
            'data' => $page['data'],
            'next_cursor' => $page['next_cursor'],
            'unread_count' => $this->notificationService->unreadCountForUser($userId),
        ]);
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

        $this->notificationService->delete($notification);

        return redirect()->back();
    }

    public function markAllAsRead(): RedirectResponse
    {
        $this->notificationService->markAllAsReadForUser(auth()->id());

        return redirect()->back();
    }

    public function bulkMarkAsRead(BulkNotificationsRequest $request): RedirectResponse
    {
        $this->notificationService->markAsReadForUser($request->user()->id, $request->ids());

        return redirect()->back();
    }

    public function bulkDestroy(BulkNotificationsRequest $request): RedirectResponse
    {
        $this->notificationService->deleteForUser($request->user()->id, $request->ids());

        return redirect()->back();
    }

    public function destroyRead(): RedirectResponse
    {
        $this->notificationService->deleteReadForUser(auth()->id());

        return redirect()->back();
    }
}
