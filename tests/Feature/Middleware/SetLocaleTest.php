<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
});

test('validation errors follow the language cookie', function () {
    $this->withUnencryptedCookie('locale', 'pl')
        ->from('/login')
        ->post('/login', [])
        ->assertSessionHasErrors('email');

    $message = app('session.store')->get('errors')->first('email');

    expect($message)->not->toBe('The email field is required.')
        ->and($message)->toContain('wymagane');
});

test('the default language is used without a cookie', function () {
    $this->from('/login')->post('/login', [])
        ->assertSessionHasErrors(['email' => 'The email field is required.']);
});

test('an unsupported cookie falls back to the default language', function () {
    $this->withUnencryptedCookie('locale', 'xx')->get('/login');

    expect(app()->getLocale())->toBe(config('app.locale'));
});

test('the session language is the fallback when there is no cookie', function () {
    $this->withSession(['locale' => 'pl'])->get('/login');

    expect(app()->getLocale())->toBe('pl');
});
