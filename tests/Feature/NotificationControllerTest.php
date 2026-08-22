<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the notifications index returns only the authenticated user\'s notifications as JSON', function () {
    $user = User::factory()->create();
    $own = Notification::factory()->create(['user_id' => $user->id, 'title' => 'Mine']);
    Notification::factory()->create(['title' => 'Not mine']);

    $response = $this->actingAs($user)->get('/notifications');

    $response->assertOk();
    $response->assertJsonCount(1);
    $response->assertJsonFragment(['id' => $own->id, 'title' => 'Mine']);
});

test('guests cannot view notifications', function () {
    $response = $this->get('/notifications');

    $response->assertRedirect(route('login'));
});

test('a user can update their own notification', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id, 'read' => false]);

    $response = $this->actingAs($user)->post("/notifications/$notification->id", [
        'type' => 'info',
        'title' => 'Updated title',
        'message' => 'Updated message',
        'read' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id,
        'title' => 'Updated title',
        'read' => true,
    ]);
});

test('a user cannot update someone else\'s notification', function () {
    $notification = Notification::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/notifications/$notification->id", [
        'type' => 'info',
        'title' => 'Hijacked',
        'message' => 'Hijacked message',
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('notifications', ['id' => $notification->id, 'title' => 'Hijacked']);
});

test('updating a notification requires type, title and message', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->post("/notifications/$notification->id", []);

    $response->assertSessionHasErrors(['type', 'title', 'message']);
});

test('updating a notification rejects a type outside the allowed list', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->post("/notifications/$notification->id", [
        'type' => 'not-a-real-type',
        'title' => 'Title',
        'message' => 'Message',
    ]);

    $response->assertSessionHasErrors('type');
});

test('guests cannot update a notification', function () {
    $notification = Notification::factory()->create();

    $response = $this->post("/notifications/$notification->id", []);

    $response->assertRedirect(route('login'));
});

test('a user can delete their own notification', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->delete("/notifications/$notification->id");

    $response->assertOk();
    $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
});

test('a user cannot delete someone else\'s notification', function () {
    $notification = Notification::factory()->create();

    $response = $this->actingAs(User::factory()->create())->delete("/notifications/$notification->id");

    $response->assertForbidden();
    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
});

test('guests cannot delete a notification', function () {
    $notification = Notification::factory()->create();

    $response = $this->delete("/notifications/$notification->id");

    $response->assertRedirect(route('login'));
});

test('marking all as read only affects the authenticated user\'s unread notifications', function () {
    $user = User::factory()->create();
    $ownUnread = Notification::factory()->count(2)->create(['user_id' => $user->id, 'read' => false]);
    $ownRead = Notification::factory()->create(['user_id' => $user->id, 'read' => true]);
    $othersUnread = Notification::factory()->create(['read' => false]);

    $response = $this->actingAs($user)->post('/notifications/mark-all-read');

    $response->assertRedirect();
    foreach ($ownUnread as $notification) {
        $this->assertDatabaseHas('notifications', ['id' => $notification->id, 'read' => true]);
    }
    $this->assertDatabaseHas('notifications', ['id' => $ownRead->id, 'read' => true]);
    $this->assertDatabaseHas('notifications', ['id' => $othersUnread->id, 'read' => false]);
});

test('guests cannot mark all notifications as read', function () {
    $response = $this->post('/notifications/mark-all-read');

    $response->assertRedirect(route('login'));
});
