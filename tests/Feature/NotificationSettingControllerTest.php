<?php

use App\Models\NotificationSetting;
use App\Models\User;

test('an authenticated user can update their notification settings', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/notification-settings', [
        'settings' => [
            'issue_assigned' => ['in_app' => true, 'email' => false],
            'issue_commented' => ['in_app' => false, 'email' => true],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Notification settings updated successfully.');

    $this->assertDatabaseHas('notification_settings', [
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'in_app',
        'enabled' => true,
    ]);
    $this->assertDatabaseHas('notification_settings', [
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'email',
        'enabled' => false,
    ]);
    $this->assertDatabaseHas('notification_settings', [
        'user_id' => $user->id,
        'type' => 'issue_commented',
        'channel' => 'in_app',
        'enabled' => false,
    ]);
    $this->assertDatabaseHas('notification_settings', [
        'user_id' => $user->id,
        'type' => 'issue_commented',
        'channel' => 'email',
        'enabled' => true,
    ]);
});

test('updating notification settings rejects an unknown notification type', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/notification-settings', [
        'settings' => [
            'not_a_real_type' => ['in_app' => true, 'email' => false],
        ],
    ]);

    $response->assertSessionHasErrors(['settings']);
    $this->assertDatabaseCount('notification_settings', 0);
});

test('updating notification settings overwrites an existing type/channel row instead of duplicating it', function () {
    $user = User::factory()->create();
    NotificationSetting::query()->create([
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'in_app',
        'enabled' => true,
    ]);

    $this->actingAs($user)->post('/account/notification-settings', [
        'settings' => [
            'issue_assigned' => ['in_app' => false, 'email' => true],
        ],
    ]);

    // The in-app row is updated in place; the email row is newly created for this type.
    $this->assertDatabaseCount('notification_settings', 2);
    $this->assertDatabaseHas('notification_settings', [
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'in_app',
        'enabled' => false,
    ]);
});

test('guests cannot update notification settings', function () {
    $response = $this->post('/account/notification-settings', [
        'settings' => [
            'issue_assigned' => ['in_app' => true, 'email' => false],
        ],
    ]);

    $response->assertRedirect(route('login'));
});
