<?php

namespace App\Http\Controllers;

use App\Http\Requests\Notifications\PurgeNotificationDataRequest;
use App\Http\Requests\Notifications\UpdateNotificationRetentionRequest;
use App\Services\NotificationRetentionService;
use Illuminate\Http\RedirectResponse;

class NotificationRetentionController extends Controller
{
    public function __construct(private readonly NotificationRetentionService $retentionService) {}

    public function update(UpdateNotificationRetentionRequest $request): RedirectResponse
    {
        $this->retentionService->updateSettings($request->user()->id, $request->validated());

        return back()->with('success', 'Clean-up schedule saved.');
    }

    /**
     * The "delete everything older than N days" button: runs once, right now,
     * independent of the saved schedule.
     */
    public function purge(PurgeNotificationDataRequest $request): RedirectResponse
    {
        $userId = $request->user()->id;
        $days = $request->integer('days');

        if ($request->validated('target') === 'notifications') {
            $deleted = $this->retentionService->purgeNotifications($userId, $days, $request->boolean('only_read'));
            $noun = $deleted === 1 ? 'notification' : 'notifications';
        } else {
            $deleted = $this->retentionService->purgeActivity($userId, $days);
            $noun = $deleted === 1 ? 'activity entry' : 'activity entries';
        }

        return back()->with('success', "Deleted $deleted $noun older than $days days.");
    }
}
