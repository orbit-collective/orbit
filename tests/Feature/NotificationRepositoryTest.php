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

test('it returns only the newest notifications once there are more than the limit', function () {
    $user = User::factory()->create();

    Notification::factory()->count(NotificationRepository::LIMIT)->create([
        'user_id' => $user->id,
        'created_at' => now()->subDay(),
    ]);
    $newest = Notification::factory()->create(['user_id' => $user->id, 'created_at' => now()]);

    $notifications = $this->repository->getAllForUser($user->id);

    expect($notifications)->toHaveCount(NotificationRepository::LIMIT)
        ->and($notifications->first()->id)->toBe($newest->id);
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

test('it can delete a notification', function () {
    $notification = Notification::factory()->create();

    $this->repository->delete($notification);

    $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
});

test('pageForUser returns one extra row so the caller can tell a next page exists', function () {
    $user = User::factory()->create();
    Notification::factory()->count(5)->create(['user_id' => $user->id]);

    expect($this->repository->pageForUser($user->id, [], null, 2))->toHaveCount(3);
});

test('pageForUser clamps the page size', function () {
    $user = User::factory()->create();
    Notification::factory()->count(NotificationRepository::MAX_PER_PAGE + 5)->create(['user_id' => $user->id]);

    expect($this->repository->pageForUser($user->id, [], null, 10_000))->toHaveCount(NotificationRepository::MAX_PER_PAGE + 1)
        ->and($this->repository->pageForUser($user->id, [], null, 0))->toHaveCount(2);
});

test('pageForUser applies the cursor and the filters together', function () {
    $user = User::factory()->create();
    $old = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'type' => 'info']);
    Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'type' => 'info']);
    $newest = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'type' => 'info']);

    $rows = $this->repository->pageForUser($user->id, ['unread' => true, 'type' => 'info'], $newest->id, 10);

    expect($rows->pluck('id')->all())->toBe([$old->id]);
});

test('countUnreadForUser ignores read and foreign notifications', function () {
    $user = User::factory()->create();
    Notification::factory()->count(2)->create(['user_id' => $user->id, 'read' => false]);
    Notification::factory()->create(['user_id' => $user->id, 'read' => true]);
    Notification::factory()->create(['read' => false]);

    expect($this->repository->countUnreadForUser($user->id))->toBe(2);
});

test('deleteOlderThanForUser can spare unread notifications', function () {
    $user = User::factory()->create();
    $oldRead = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(40)]);
    $oldUnread = Notification::factory()->create(['user_id' => $user->id, 'read' => false, 'created_at' => now()->subDays(40)]);
    $recent = Notification::factory()->create(['user_id' => $user->id, 'read' => true, 'created_at' => now()->subDays(2)]);
    $foreign = Notification::factory()->create(['read' => true, 'created_at' => now()->subDays(40)]);

    $deleted = $this->repository->deleteOlderThanForUser($user->id, now()->subDays(30), onlyRead: true);

    expect($deleted)->toBe(1);
    $this->assertDatabaseMissing('notifications', ['id' => $oldRead->id]);
    $this->assertDatabaseHas('notifications', ['id' => $oldUnread->id]);
    $this->assertDatabaseHas('notifications', ['id' => $recent->id]);
    $this->assertDatabaseHas('notifications', ['id' => $foreign->id]);

    expect($this->repository->deleteOlderThanForUser($user->id, now()->subDays(30)))->toBe(1);
});
