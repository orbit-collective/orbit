<?php

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\NotificationSetting;
use App\Models\User;
use App\Notifications\NotificationMail;
use App\Repositories\NotificationSettingRepository;
use App\Services\ActivityLogService;
use App\Services\NotificationMailService;
use App\Services\NotificationSettingService;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->userService = Mockery::mock(UserService::class);
    $this->notificationSettingRepository = Mockery::mock(NotificationSettingRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->notificationSettingService = new NotificationSettingService($this->notificationSettingRepository, $this->activityLogService);
    $this->service = new NotificationMailService($this->userService, $this->notificationSettingService);

    Notification::fake();
});

test('it sends the mail notification when the email channel is enabled for the type', function () {
    $user = User::factory()->create();

    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with($user->id, NotificationType::IssueAssigned, NotificationChannel::Email)
        ->andReturn(new NotificationSetting(['enabled' => true]));

    $this->userService->shouldReceive('getUserById')
        ->once()
        ->with($user->id)
        ->andReturn($user);

    $this->service->send($user->id, NotificationType::IssueAssigned, 'You were assigned', 'Details here.', '/issues/1');

    Notification::assertSentTo(
        $user,
        NotificationMail::class,
        fn (NotificationMail $mail) => $mail->title === 'You were assigned'
            && $mail->body === 'Details here.'
            && $mail->actionUrl === '/issues/1'
    );
});

test('it does not send mail when the email channel is disabled for the type', function () {
    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with(5, NotificationType::IssueCommented, NotificationChannel::Email)
        ->andReturn(new NotificationSetting(['enabled' => false]));

    $this->userService->shouldNotReceive('getUserById');

    $this->service->send(5, NotificationType::IssueCommented, 'Title', 'Message');

    Notification::assertNothingSent();
});

test('it does not send mail or crash when the recipient no longer exists', function () {
    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->andReturn(new NotificationSetting(['enabled' => true]));

    $this->userService->shouldReceive('getUserById')
        ->once()
        ->with(999)
        ->andReturn(null);

    $this->service->send(999, NotificationType::ProjectInvited, 'Title', 'Message');

    Notification::assertNothingSent();
});

test('it does not send mail when no setting row exists yet, since email defaults to disabled', function () {
    $this->notificationSettingRepository->shouldReceive('find')
        ->once()
        ->with(5, NotificationType::IssueAssigned, NotificationChannel::Email)
        ->andReturn(null);

    $this->userService->shouldNotReceive('getUserById');

    $this->service->send(5, NotificationType::IssueAssigned, 'Title', 'Message');

    Notification::assertNothingSent();
});
