<?php

use App\Support\Sessions\SessionRegistry;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\SessionManager;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    $this->handler = new ArraySessionHandler(120);

    $store = Mockery::mock();
    $store->shouldReceive('getHandler')->andReturn($this->handler);
    $manager = Mockery::mock(SessionManager::class);
    $manager->shouldReceive('driver')->andReturn($store);

    $this->registry = new SessionRegistry($manager);
});

test('it is only enabled for session drivers that cannot be searched by user', function (string $driver, bool $enabled) {
    config(['session.driver' => $driver]);

    expect($this->registry->enabled())->toBe($enabled);
})->with([
    ['redis', true],
    ['memcached', true],
    ['database', false],
    ['array', false],
    ['file', false],
]);

test('a touched session is listed with its device details', function () {
    $this->handler->write('session-a', 'payload');

    $this->registry->touch(1, 'session-a', '10.0.0.1', 'Agent A');

    $sessions = $this->registry->forUser(1);

    expect($sessions)->toHaveCount(1)
        ->and($sessions->first())->toMatchObject([
            'id' => 'session-a',
            'user_id' => 1,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Agent A',
        ]);
});

test('sessions are listed newest activity first and only for their own user', function () {
    $this->handler->write('older', 'payload');
    $this->handler->write('newer', 'payload');
    $this->handler->write('someone-else', 'payload');

    Date::setTestNow('2026-10-11 10:00:00');
    $this->registry->touch(1, 'older', null, null);
    Date::setTestNow('2026-10-11 11:00:00');
    $this->registry->touch(1, 'newer', null, null);
    $this->registry->touch(2, 'someone-else', null, null);

    expect($this->registry->forUser(1)->pluck('id')->all())->toBe(['newer', 'older'])
        ->and($this->registry->forUser(2)->pluck('id')->all())->toBe(['someone-else']);
});

test('a session whose payload is gone is no longer listed', function () {
    $this->handler->write('alive', 'payload');
    $this->handler->write('expired', 'payload');
    $this->registry->touch(1, 'alive', null, null);
    $this->registry->touch(1, 'expired', null, null);

    $this->handler->destroy('expired');

    expect($this->registry->forUser(1)->pluck('id')->all())->toBe(['alive']);
});

test('revoking a session destroys its payload and removes it from the list', function () {
    $this->handler->write('other', 'payload');
    $this->registry->touch(1, 'other', null, null);

    expect($this->registry->revoke(1, 'other'))->toBeTrue()
        ->and($this->handler->read('other'))->toBe('')
        ->and($this->registry->forUser(1))->toBeEmpty();
});

test('a user cannot revoke a session that is not theirs or does not exist', function () {
    $this->handler->write('theirs', 'payload');
    $this->registry->touch(2, 'theirs', null, null);

    expect($this->registry->revoke(1, 'theirs'))->toBeFalse()
        ->and($this->registry->revoke(1, 'missing'))->toBeFalse()
        ->and($this->handler->read('theirs'))->toBe('payload');
});

test('revoking the others keeps only the given session', function () {
    foreach (['current', 'phone', 'laptop'] as $id) {
        $this->handler->write($id, 'payload');
        $this->registry->touch(1, $id, null, null);
    }

    expect($this->registry->revokeOthers(1, 'current'))->toBe(2)
        ->and($this->registry->forUser(1)->pluck('id')->all())->toBe(['current'])
        ->and($this->handler->read('phone'))->toBe('');
});

test('forget() drops a session from the list without touching its payload', function () {
    $this->handler->write('a', 'payload');
    $this->registry->touch(1, 'a', null, null);

    $this->registry->forget(1, 'a');

    expect($this->registry->forUser(1))->toBeEmpty()
        ->and($this->handler->read('a'))->toBe('payload');
});
