<?php

namespace App\Http\Controllers;

use App\Http\Requests\Notifications\UpdateNotificationSettingsRequest;
use App\Services\NotificationSettingService;
use Illuminate\Http\RedirectResponse;

class NotificationSettingController extends Controller
{
    public function __construct(private readonly NotificationSettingService $notificationSettingService) {}

    public function update(UpdateNotificationSettingsRequest $request): RedirectResponse
    {
        $this->notificationSettingService->updateSettings($request->user()->id, $request->validated('settings'));

        return back()->with('success', 'Notification settings updated successfully.');
    }
}
