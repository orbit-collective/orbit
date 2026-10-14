<?php

use App\Enums\Notifications\RetentionFrequency;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\NotificationRetentionSetting;
use App\Models\User;
use App\Repositories\NotificationRepository;
use App\Repositories\NotificationRetentionRepository;
use App\Services\ActivityLogService;
use App\Services\NotificationRetentionService;
use App\Services\NotificationService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

function retentionSetting(User $user, array $overrides = []): NotificationRetentionSetting
{
    return NotificationRetentionSetting::create(array_merge([
        'user_id' => $user->id,
        'enabled' => true,
        'frequency' => RetentionFrequency::Daily,
        'notifications_older_than_days' => 30,
        'notifications_only_read' => true,
        'activity_older_than_days' => null,
    ], $overrides));
}

function oldActivity(User $user, int $daysAgo, ?int $loggedBy = null): ActivityLog
{
    $entry = ActivityLog::create(['project_id' => null, 'user_id' => $loggedBy ?? $user->id, 'body' => 'x']);
    $entry->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

    return $entry;
}

test('settings default to an off schedule', function () {
    $settings = app(NotificationRetentionService::class)->getSettings(User::factory()->create()->id);

    expect($settings)->toMatchArray([
        'enabled' => false,
        'frequency' => 'weekly',
        'notifications_older_than_days' => null,
        'notifications_only_read' => true,
        'activity_older_than_days' => null,
        'last_run_at' => null,
    ]);
});

test('a due schedule deletes old read notifications and keeps the rest', function () {
    $user = User::factory()->create();
    retentionSetting($user);
    $oldRead = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(40)]);
    $oldUnread = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(40)]);
    $fresh = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(3)]);

    $ran = app(NotificationRetentionService::class)->runDue();

    expect($ran)->toBe(1);
    $this->assertDatabaseMissing('notifications', ['id' => $oldRead->id]);
    $this->assertDatabaseHas('notifications', ['id' => $oldUnread->id]);
    $this->assertDatabaseHas('notifications', ['id' => $fresh->id]);
    expect(NotificationRetentionSetting::first()->last_run_at)->not->toBeNull();
});

test('the schedule can also remove unread notifications and old activity entries', function () {
    $user = User::factory()->create();
    retentionSetting($user, ['notifications_only_read' => false, 'activity_older_than_days' => 10]);
    $oldUnread = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(40)]);
    $oldEntry = oldActivity($user, 20);
    $freshEntry = oldActivity($user, 2);
    $someoneElses = oldActivity($user, 20, User::factory()->create()->id);

    app(NotificationRetentionService::class)->runDue();

    $this->assertDatabaseMissing('notifications', ['id' => $oldUnread->id]);
    $this->assertDatabaseMissing('activity_logs', ['id' => $oldEntry->id]);
    $this->assertDatabaseHas('activity_logs', ['id' => $freshEntry->id]);
    $this->assertDatabaseHas('activity_logs', ['id' => $someoneElses->id]);
});

test('schedules wait a full period, and disabled ones never run', function () {
    $daily = User::factory()->create();
    $weekly = User::factory()->create();
    $off = User::factory()->create();
    retentionSetting($daily, ['last_run_at' => now()->subHours(25)]);
    retentionSetting($weekly, ['frequency' => RetentionFrequency::Weekly, 'last_run_at' => now()->subDays(3)]);
    retentionSetting($off, ['enabled' => false]);

    expect(app(NotificationRetentionService::class)->runDue())->toBe(1);

    // ...and a schedule that just ran is not due again.
    expect(app(NotificationRetentionService::class)->runDue())->toBe(0);
});

test('a failing clean-up is skipped and stays due', function () {
    $user = User::factory()->create();
    retentionSetting($user);
    $service = Mockery::mock(NotificationRetentionService::class, [
        app(NotificationRetentionRepository::class),
        app(NotificationRepository::class),
        app(NotificationService::class),
        app(ActivityLogService::class),
    ])->makePartial();
    $service->shouldReceive('purgeNotifications')->andThrow(new RuntimeException('boom'));

    expect($service->runDue())->toBe(0)
        ->and(NotificationRetentionSetting::first()->last_run_at)->toBeNull();
});

function retentionServiceWithDue(Collection $due, ?Closure $configure = null): NotificationRetentionService
{
    $repository = Mockery::mock(app(NotificationRetentionRepository::class))->makePartial();
    $repository->shouldReceive('getDue')->andReturn($due);
    if ($configure) {
        $configure($repository);
    }

    return new NotificationRetentionService(
        $repository,
        app(NotificationRepository::class),
        app(NotificationService::class),
        app(ActivityLogService::class),
    );
}

test('a schedule switched off after the due list was read deletes nothing', function () {
    $user = User::factory()->create();
    $setting = retentionSetting($user);
    $notification = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(40)]);
    $stale = $setting->replicate()->forceFill(['id' => $setting->id]);
    $setting->update(['enabled' => false]);

    $ran = retentionServiceWithDue(collect([$stale]))->runDue();

    expect($ran)->toBe(0);
    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
});

test('keep-unread turned on after the due list was read is honoured', function () {
    $user = User::factory()->create();
    $setting = retentionSetting($user, ['notifications_only_read' => false]);
    $unread = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(40)]);
    $stale = $setting->replicate()->forceFill(['id' => $setting->id]);
    $setting->update(['notifications_only_read' => true]);

    retentionServiceWithDue(collect([$stale]))->runDue();

    $this->assertDatabaseHas('notifications', ['id' => $unread->id]);
});

test('a schedule that ran meanwhile is not run again', function () {
    $user = User::factory()->create();
    $setting = retentionSetting($user);
    $notification = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(40)]);
    $stale = $setting->replicate()->forceFill(['id' => $setting->id]);
    $setting->update(['last_run_at' => now()->subMinute()]);

    expect(retentionServiceWithDue(collect([$stale]))->runDue())->toBe(0);
    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
});

test('a schedule deleted with its user after the due list was read is skipped, not recreated', function () {
    $gone = User::factory()->create();
    $kept = User::factory()->create();
    $goneSetting = retentionSetting($gone);
    $keptSetting = retentionSetting($kept);
    Notification::factory()->create(['user_id' => $kept->id, 'read' => true, 'created_at' => now()->subDays(40)]);
    $due = collect([$goneSetting->replicate()->forceFill(['id' => $goneSetting->id]), $keptSetting]);
    $gone->delete();

    $ran = retentionServiceWithDue($due)->runDue();

    expect($ran)->toBe(1)
        ->and(NotificationRetentionSetting::where('user_id', $gone->id)->exists())->toBeFalse()
        ->and(Notification::where('user_id', $kept->id)->count())->toBe(0);
});

test('a failure while recording a run does not stop the other users', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();
    $firstSetting = retentionSetting($first);
    $secondSetting = retentionSetting($second);

    $service = retentionServiceWithDue(
        collect([$firstSetting, $secondSetting]),
        fn ($repository) => $repository->shouldReceive('markRun')
            ->once()->with($first->id, Mockery::any())->andThrow(new RuntimeException('boom'))
            ->getMock()->shouldReceive('markRun')->passthru(),
    );

    expect($service->runDue())->toBe(1)
        ->and($firstSetting->fresh()->last_run_at)->toBeNull()
        ->and($secondSetting->fresh()->last_run_at)->not->toBeNull();
});

test('the prune command runs the due schedules', function () {
    $user = User::factory()->create();
    retentionSetting($user);
    Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(40)]);

    $this->artisan('notifications:prune')->expectsOutput('Ran 1 notification clean-up schedule(s).')->assertSuccessful();

    expect(Notification::count())->toBe(0);
});

test('the prune command is scheduled hourly', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event) => str_contains($event->command, 'notifications:prune'));

    expect($events)->toHaveCount(1)->and($events->first()->expression)->toBe('0 * * * *');
});

test('a user saves their schedule', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/notification-retention', [
        'enabled' => true,
        'frequency' => 'monthly',
        'notifications_older_than_days' => 60,
        'notifications_only_read' => false,
        'activity_older_than_days' => null,
    ])->assertRedirect()->assertSessionHas('success');

    $this->assertDatabaseHas('notification_retention_settings', [
        'user_id' => $user->id,
        'enabled' => true,
        'frequency' => 'monthly',
        'notifications_older_than_days' => 60,
        'notifications_only_read' => false,
    ]);
});

test('saving a schedule validates its fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/notification-retention', [
        'enabled' => true,
        'frequency' => 'hourly',
        'notifications_older_than_days' => 0,
        'notifications_only_read' => true,
    ])->assertSessionHasErrors(['frequency', 'notifications_older_than_days']);

    $this->actingAs($user)->post('/account/notification-retention', [
        'enabled' => true,
        'frequency' => 'daily',
        'notifications_only_read' => true,
    ])->assertSessionHasErrors('enabled');
});

test('the settings page exposes the schedule', function () {
    $user = User::factory()->create();
    retentionSetting($user, ['frequency' => RetentionFrequency::Weekly]);

    $this->actingAs($user)->get('/settings/notifications')
        ->assertInertia(fn ($page) => $page->where('notificationRetention.frequency', 'weekly')->where('notificationRetention.enabled', true));
});

test('purging notifications deletes only the user\'s old ones and reports the count', function () {
    $user = User::factory()->create();
    $old = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(20)]);
    $foreign = Notification::factory()->create(['created_at' => now()->subDays(20)]);

    $this->actingAs($user)->post('/account/notification-retention/purge', ['target' => 'notifications', 'days' => 7])
        ->assertRedirect()->assertSessionHas('success', 'Deleted 1 notification older than 7 days.');

    $this->assertDatabaseMissing('notifications', ['id' => $old->id]);
    $this->assertDatabaseHas('notifications', ['id' => $foreign->id]);
});

test('purging notifications can spare the unread ones', function () {
    $user = User::factory()->create();
    $unread = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(20)]);

    $this->actingAs($user)->post('/account/notification-retention/purge', ['target' => 'notifications', 'days' => 7, 'only_read' => true])
        ->assertSessionHas('success', 'Deleted 0 notifications older than 7 days.');

    $this->assertDatabaseHas('notifications', ['id' => $unread->id]);
});

test('purging activity deletes only the user\'s own old entries', function () {
    $user = User::factory()->create();
    $old = oldActivity($user, 20);
    $other = oldActivity($user, 20, User::factory()->create()->id);

    $this->actingAs($user)->post('/account/notification-retention/purge', ['target' => 'activity', 'days' => 7])
        ->assertSessionHas('success', 'Deleted 1 activity entry older than 7 days.');

    $this->assertDatabaseMissing('activity_logs', ['id' => $old->id]);
    $this->assertDatabaseHas('activity_logs', ['id' => $other->id]);
});

test('purging validates the target and the age, and guests are redirected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/notification-retention/purge', ['target' => 'users', 'days' => 0])
        ->assertSessionHasErrors(['target', 'days']);

    auth()->logout();
    $this->post('/account/notification-retention/purge', ['target' => 'activity', 'days' => 7])->assertRedirect(route('login'));
    $this->post('/account/notification-retention', [])->assertRedirect(route('login'));
});
