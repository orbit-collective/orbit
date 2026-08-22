<?php

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('mass assignment via fillable creates a user', function () {
    $user = User::create([
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'plain-text-password',
    ]);

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
    ]);
});

test('the password is stored hashed, never in plain text', function () {
    $user = User::create([
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'plain-text-password',
    ]);

    expect($user->password)->not->toBe('plain-text-password')
        ->and(Hash::check('plain-text-password', $user->password))->toBeTrue();
});

test('the password and remember_token are hidden from array/JSON serialization', function () {
    $user = User::factory()->create();

    $array = $user->toArray();

    expect($array)->not->toHaveKey('password')
        ->and($array)->not->toHaveKey('remember_token');
});

test('the email column must be unique', function () {
    User::factory()->create(['email' => 'duplicate@example.com']);
    User::factory()->create(['email' => 'duplicate@example.com']);
})->throws(QueryException::class);
