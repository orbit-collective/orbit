<?php

use App\Models\User;
use App\Notifications\NotificationMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Queue\Middleware\RateLimited;

uses(RefreshDatabase::class);

test('it sends only via mail', function () {
    $notification = new NotificationMail('Title', 'Body');

    expect($notification->via(new User))->toBe(['mail']);
});

test('it builds a mail message with the subject and renders the greeting and body via the notification view', function () {
    $user = User::factory()->make(['name' => 'Ada Lovelace']);
    $notification = new NotificationMail('You were assigned', 'Details about the issue.');

    $mail = $notification->toMail($user);

    expect($mail->subject)->toBe('You were assigned')
        ->and($mail->view)->toBe('emails.notification')
        ->and($mail->viewData['notifiable'])->toBe($user)
        ->and($mail->viewData['body'])->toBe('Details about the issue.')
        ->and($mail->viewData['actionUrl'])->toBeNull();

    $rendered = $mail->render();

    expect($rendered)->toContain('Hello Ada Lovelace!')
        ->and($rendered)->toContain('Details about the issue.');
});

test('it includes an action button when an action URL is given', function () {
    $user = User::factory()->make();
    $notification = new NotificationMail('Title', 'Body', '/issues/1');

    $mail = $notification->toMail($user);

    expect($mail->viewData['actionUrl'])->toBe('/issues/1');

    $rendered = $mail->render();

    expect($rendered)->toContain('View in Orbit')
        ->and($rendered)->toContain('/issues/1');
});

test('it rate-limits the mail channel so a burst of notifications does not exceed the provider limit', function () {
    $notification = new NotificationMail('Title', 'Body');

    $middleware = $notification->middleware(new User, 'mail');

    expect($middleware)->toHaveCount(1)
        ->and($middleware[0])->toBeInstanceOf(RateLimited::class);
});

test('it applies no middleware for channels other than mail', function () {
    $notification = new NotificationMail('Title', 'Body');

    expect($notification->middleware(new User, 'database'))->toBe([]);
});

test('it retries a few times with increasing delays on transient failures', function () {
    $notification = new NotificationMail('Title', 'Body');

    expect($notification->tries)->toBe(5)
        ->and($notification->backoff())->toBe([10, 30, 60, 120]);
});
