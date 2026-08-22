<?php

use App\Models\Notification;
use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new NotificationRepository();
});

test('it only returns notifications for the given user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Notification::factory()->count(3)->create(['user_id' => $user->id]);
    Notification::factory()->count(2)->create(['user_id' => $otherUser->id]);

    $notifications = $this->repository->getAllForUser($user->id);

    expect($notifications)->toHaveCount(3)
        ->and($notifications->pluck('user_id')->unique()->all())->toBe([$user->id]);
});

test('it can store a new notification', function () {
    $user = User::factory()->create();
    $data = [
        'user_id' => $user->id,
        'type' => 'info',
        'title' => 'New Notification',
        'message' => 'Something happened',
        'read' => false,
    ];

    $notification = $this->repository->store($data);

    expect($notification)->toBeInstanceOf(Notification::class);
    $this->assertDatabaseHas('notifications', ['title' => 'New Notification', 'user_id' => $user->id]);
});

test('it can update a notification', function () {
    $notification = Notification::factory()->create(['title' => 'Old Title']);

    $updated = $this->repository->update($notification, ['title' => 'New Title']);

    expect($updated->title)->toBe('New Title');
    $this->assertDatabaseHas('notifications', ['id' => $notification->id, 'title' => 'New Title']);
});

test('it only marks the given user unread notifications as read', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Notification::factory()->count(2)->create(['user_id' => $user->id, 'read' => false]);
    Notification::factory()->create(['user_id' => $user->id, 'read' => true]);
    Notification::factory()->create(['user_id' => $otherUser->id, 'read' => false]);

    $count = $this->repository->markAllAsReadForUser($user->id);

    expect($count)->toBe(2)
        ->and(Notification::where('user_id', $user->id)->where('read', false)->count())->toBe(0)
        ->and(Notification::where('user_id', $otherUser->id)->where('read', false)->count())->toBe(1);
});
