<?php

use App\Services\MailConfigurationService;

test('email is reported as disabled when the mailer is the log driver', function () {
    config(['mail.default' => 'log']);

    expect((new MailConfigurationService())->isEnabled())->toBeFalse();
});

test('email is reported as disabled when the mailer is the array driver', function () {
    config(['mail.default' => 'array']);

    expect((new MailConfigurationService())->isEnabled())->toBeFalse();
});

test('email is reported as disabled when no mailer is configured', function () {
    config(['mail.default' => null]);

    expect((new MailConfigurationService())->isEnabled())->toBeFalse();
});

test('email is reported as enabled for a real delivering mailer', function () {
    config(['mail.default' => 'smtp']);

    expect((new MailConfigurationService())->isEnabled())->toBeTrue();
});
