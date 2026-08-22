<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created notification persists with the expected attributes', function () {
    $notification = Notification::factory()->create();

    expect($notification->exists)->toBeTrue()
        ->and($notification->type)->toBeIn(['success', 'info', 'warning', 'error']);
});

test('mass assignment via fillable creates a notification', function () {
    $user = User::factory()->create();

    $notification = Notification::create([
        'user_id' => $user->id,
        'type' => 'info',
        'title' => 'Heads up',
        'message' => 'Something happened',
        'read' => false,
        'action_url' => null,
    ]);

    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id,
        'user_id' => $user->id,
        'title' => 'Heads up',
    ]);
});

test('user() belongs to the user referenced by user_id', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id]);

    expect($notification->user())->toBeInstanceOf(BelongsTo::class)
        ->and($notification->user->id)->toBe($user->id);
});

test('the read flag reflects the value it was created with', function () {
    $unread = Notification::factory()->create(['read' => false]);
    $read = Notification::factory()->create(['read' => true]);

    expect((bool)$unread->fresh()->read)->toBeFalse()
        ->and((bool)$read->fresh()->read)->toBeTrue();
});

test('user_id is required and cannot be null', function () {
    Notification::factory()->create(['user_id' => null]);
})->throws(QueryException::class);

test('deleting the user cascades to delete their notifications', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $user->id]);

    $user->delete();

    $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
});
