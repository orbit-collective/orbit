<?php

use App\Models\User;
use App\Notifications\NotificationMail;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it sends only via mail', function () {
    $notification = new NotificationMail('Title', 'Body');

    expect($notification->via(new User))->toBe(['mail']);
});

test('it builds a mail message with the greeting, subject and body', function () {
    $user = User::factory()->make(['name' => 'Ada Lovelace']);
    $notification = new NotificationMail('You were assigned', 'Details about the issue.');

    $mail = $notification->toMail($user);

    expect($mail->subject)->toBe('You were assigned');
    expect($mail->greeting)->toBe('Hello Ada Lovelace!');
    expect($mail->introLines)->toContain('Details about the issue.');
    expect($mail->actionText)->toBeNull();
});

test('it includes an action button when an action URL is given', function () {
    $user = User::factory()->make();
    $notification = new NotificationMail('Title', 'Body', '/issues/1');

    $mail = $notification->toMail($user);

    expect($mail->actionText)->toBe('View in Orbit');
    expect($mail->actionUrl)->toBe('/issues/1');
});
