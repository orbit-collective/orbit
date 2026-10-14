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
    $response->assertJsonCount(1, 'data');
    $response->assertJsonFragment(['id' => $own->id, 'title' => 'Mine']);
    $response->assertJsonPath('next_cursor', null);
});

test('the index pages through the inbox with a keyset cursor', function () {
    $user = User::factory()->create();
    $ids = Notification::factory()->count(5)->create(['user_id' => $user->id])->pluck('id')->reverse()->values();

    $first = $this->actingAs($user)->getJson('/notifications?per_page=2');

    $first->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('next_cursor', $ids[1]);
    expect(collect($first->json('data'))->pluck('id')->all())->toBe([$ids[0], $ids[1]]);

    $last = $this->actingAs($user)->getJson('/notifications?per_page=2&before='.$ids[3]);

    expect(collect($last->json('data'))->pluck('id')->all())->toBe([$ids[4]]);
    $last->assertJsonPath('next_cursor', null);
});

test('the index filters by unread and severity and reports the unread total', function () {
    $user = User::factory()->create();
    Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'type' => 'info']);
    $match = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'type' => 'error']);
    Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'type' => 'info']);

    $response = $this->actingAs($user)->getJson('/notifications?unread=1&type=error');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $match->id);
    $response->assertJsonPath('unread_count', 2);
});

test('the index rejects an unknown severity and an oversized page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/notifications?type=nope')->assertStatus(422)->assertJsonValidationErrors('type');
    $this->actingAs($user)->get('/notifications?per_page=500')->assertStatus(422)->assertJsonValidationErrors('per_page');
});

test('bulk-read marks only the given notifications of the user as read', function () {
    $user = User::factory()->create();
    $mine = Notification::factory()->count(2)->create(['user_id' => $user->id, 'read' => false]);
    $untouched = Notification::factory()->create(['user_id' => $user->id, 'read' => false]);
    $foreign = Notification::factory()->create(['read' => false]);

    $this->actingAs($user)->post('/notifications/bulk-read', [
        'ids' => [...$mine->pluck('id'), $foreign->id],
    ])->assertRedirect();

    expect(Notification::whereIn('id', $mine->pluck('id'))->where('read', true)->count())->toBe(2)
        ->and($untouched->fresh()->read)->toBeFalsy()
        ->and($foreign->fresh()->read)->toBeFalsy();
});

test('bulk-delete removes only the given notifications of the user', function () {
    $user = User::factory()->create();
    $mine = Notification::factory()->count(2)->create(['user_id' => $user->id]);
    $kept = Notification::factory()->create(['user_id' => $user->id]);
    $foreign = Notification::factory()->create();

    $this->actingAs($user)->post('/notifications/bulk-delete', [
        'ids' => [...$mine->pluck('id'), $foreign->id],
    ])->assertRedirect();

    $this->assertDatabaseMissing('notifications', ['id' => $mine[0]->id]);
    $this->assertDatabaseMissing('notifications', ['id' => $mine[1]->id]);
    $this->assertDatabaseHas('notifications', ['id' => $kept->id]);
    $this->assertDatabaseHas('notifications', ['id' => $foreign->id]);
});

test('bulk actions require a bounded, non-empty list of ids', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/notifications/bulk-delete', [])->assertSessionHasErrors('ids');
    $this->actingAs($user)->post('/notifications/bulk-read', ['ids' => range(1, 201)])->assertSessionHasErrors('ids');
    $this->actingAs($user)->post('/notifications/bulk-read', ['ids' => ['abc']])->assertSessionHasErrors('ids.0');
});

test('deleting read notifications keeps the unread ones', function () {
    $user = User::factory()->create();
    Notification::factory()->count(2)->create(['user_id' => $user->id, 'read' => true]);
    $unread = Notification::factory()->create(['user_id' => $user->id, 'read' => false]);
    $foreignRead = Notification::factory()->create(['read' => true]);

    $this->actingAs($user)->delete('/notifications/read')->assertRedirect();

    expect(Notification::where('user_id', $user->id)->pluck('id')->all())->toBe([$unread->id]);
    $this->assertDatabaseHas('notifications', ['id' => $foreignRead->id]);
});

test('guests cannot use the bulk endpoints', function () {
    $this->post('/notifications/bulk-read', ['ids' => [1]])->assertRedirect(route('login'));
    $this->post('/notifications/bulk-delete', ['ids' => [1]])->assertRedirect(route('login'));
    $this->delete('/notifications/read')->assertRedirect(route('login'));
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

    $response->assertRedirect();
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

test('the cached notification list follows deletes, updates and mark-all-read', function () {
    $user = User::factory()->create();
    $first = Notification::factory()->create(['user_id' => $user->id, 'read' => false]);
    $second = Notification::factory()->create(['user_id' => $user->id, 'read' => false]);

    $this->actingAs($user)->get('/notifications')->assertJsonCount(2, 'data');

    $this->delete("/notifications/$first->id");
    $this->get('/notifications')->assertJsonCount(1, 'data');

    $this->post('/notifications/mark-all-read');
    expect($this->get('/notifications')->json('data.0.read'))->toBeTruthy();

    expect($second->fresh()->read)->toBeTruthy();
});
