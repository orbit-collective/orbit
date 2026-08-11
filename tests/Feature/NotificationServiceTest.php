<?php

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\Notification;
use App\Models\NotificationSetting;
use App\Repositories\NotificationRepository;
use App\Repositories\NotificationSettingRepository;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use App\Services\NotificationSettingService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->notificationRepository = Mockery::mock(NotificationRepository::class);
    $this->notificationSettingRepository = Mockery::mock(NotificationSettingRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->notificationSettingService = new NotificationSettingService($this->notificationSettingRepository, $this->activityLogService);
    $this->service = new NotificationService($this->notificationRepository, $this->notificationSettingService);
});

test('it can get all notifications for a user', function () {
    $notifications = new Collection([new Notification(['id' => 1, 'user_id' => 5])]);

    $this->notificationRepository->shouldReceive('getAllForUser')
        ->once()
        ->with(5)
        ->andReturn($notifications);

    $result = $this->service->getAllForUser(5);

    expect($result)->toBe($notifications);
});

test('it can store a new notification', function () {
    $data = ['user_id' => 5, 'type' => 'info', 'title' => 'Test', 'message' => 'Test message', 'read' => false];
    $notification = new Notification($data);

    $this->notificationRepository->shouldReceive('store')
        ->once()
        ->with($data)
        ->andReturn($notification);

    $result = $this->service->store($data);

    expect($result)->toBe($notification);
});

test('it can update a notification', function () {
    $notification = Notification::factory()->make(['id' => 1]);
    $data = ['title' => 'Updated Title'];

    $this->notificationRepository->shouldReceive('update')
        ->once()
        ->with($notification, $data)
        ->andReturn($notification);

    $result = $this->service->update($notification, $data);

    expect($result)->toBe($notification);
});

test('it can mark all of a user notifications as read', function () {
    $this->notificationRepository->shouldReceive('markAllAsReadForUser')
        ->once()
        ->with(5)
        ->andReturn(2);

    $result = $this->service->markAllAsReadForUser(5);

    expect($result)->toBe(2);
});

test('it notifies a specific user when the notification type is enabled for in-app delivery', function () {
    $notification = new Notification(['id' => 1, 'user_id' => 5]);

    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with(5, NotificationType::IssueStatusChanged, NotificationChannel::InApp)
        ->andReturn(new NotificationSetting(['enabled' => true]));

    $this->notificationRepository->shouldReceive('store')
        ->once()
        ->with([
            'user_id' => 5,
            'notification_type' => NotificationType::IssueStatusChanged,
            'type' => 'info',
            'title' => 'Issue #1 updated',
            'message' => 'You updated "Test": status changed from "open" to "closed".',
            'read' => false,
            'action_url' => '/projects/1?issue=1',
        ])
        ->andReturn($notification);

    $result = $this->service->notify(
        5,
        NotificationType::IssueStatusChanged,
        'info',
        'Issue #1 updated',
        'You updated "Test": status changed from "open" to "closed".',
        '/projects/1?issue=1'
    );

    expect($result)->toBe($notification);
});

test('it falls back to the channel default when no setting row exists yet', function () {
    $notification = new Notification(['id' => 1, 'user_id' => 5]);

    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with(5, NotificationType::IssueCommented, NotificationChannel::InApp)
        ->andReturn(null);

    $this->notificationRepository->shouldReceive('store')
        ->once()
        ->andReturn($notification);

    $result = $this->service->notify(5, NotificationType::IssueCommented, 'info', 'Title', 'Message');

    expect($result)->toBe($notification);
});

test('it does not create a notification when the type is disabled for in-app delivery', function () {
    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with(5, NotificationType::IssueCommented, NotificationChannel::InApp)
        ->andReturn(new NotificationSetting(['enabled' => false]));

    $this->notificationRepository->shouldNotReceive('store');

    $result = $this->service->notify(
        5,
        NotificationType::IssueCommented,
        'info',
        'New comment on your issue',
        'Someone commented on your issue.'
    );

    expect($result)->toBeNull();
});
