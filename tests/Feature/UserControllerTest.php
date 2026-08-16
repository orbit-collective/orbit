<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('an authenticated user can mark onboarding as completed', function () {
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $response = $this->actingAs($user)->post('/onboarding/complete');

    $response->assertRedirect();
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'has_completed_onboarding' => true,
    ]);
});

test('guests cannot mark onboarding as completed', function () {
    $response = $this->post('/onboarding/complete');

    $response->assertRedirect(route('login'));
});

test('an authenticated user can mark project onboarding as completed', function () {
    $user = User::factory()->create(['has_completed_project_onboarding' => false]);

    $response = $this->actingAs($user)->post('/onboarding/project/complete');

    $response->assertRedirect();
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'has_completed_project_onboarding' => true,
    ]);
});

test('guests cannot mark project onboarding as completed', function () {
    $response = $this->post('/onboarding/project/complete');

    $response->assertRedirect(route('login'));
});

test('an authenticated user can rename account name', function () {
    $user = User::factory()->create(['name' => 'Old Name']);

    $response = $this->actingAs($user)->post('/account/rename', [
        'name' => 'New Name',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Profile name has been updated successfully.');
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'New Name',
    ]);
});

test('rename name requires a non-empty name', function () {
    $user = User::factory()->create(['name' => 'Old Name']);

    $response = $this->from('/settings')->actingAs($user)->post('/account/rename', [
        'name' => '',
    ]);

    $response->assertRedirect('/settings');
    $response->assertSessionHasErrors(['name']);
    $response->assertSessionHas(
        'error',
        'Profile name update failed. Please fix the form errors.',
    );
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Old Name',
    ]);
});

test('guests cannot rename account name', function () {
    $response = $this->post('/account/rename', [
        'name' => 'New Name',
    ]);

    $response->assertRedirect(route('login'));
});

test('an authenticated user can change their password', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $response = $this->actingAs($user)->post('/account/change-password', [
        'current_password' => 'old-password',
        'new_password' => 'new-password',
        'new_password_confirmation' => 'new-password',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Password has been updated successfully.');
    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('changing password fails when current password is incorrect', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $response = $this->actingAs($user)->post('/account/change-password', [
        'current_password' => 'wrong-password',
        'new_password' => 'new-password',
        'new_password_confirmation' => 'new-password',
    ]);

    $response->assertSessionHasErrors(['current_password']);
    expect(Hash::check('old-password', $user->fresh()->password))->toBeTrue();
});

test('changing password requires new password to be confirmed', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $response = $this->actingAs($user)->post('/account/change-password', [
        'current_password' => 'old-password',
        'new_password' => 'new-password',
        'new_password_confirmation' => 'does-not-match',
    ]);

    $response->assertSessionHasErrors(['new_password']);
    expect(Hash::check('old-password', $user->fresh()->password))->toBeTrue();
});

test('changing password requires a minimum length', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $response = $this->actingAs($user)->post('/account/change-password', [
        'current_password' => 'old-password',
        'new_password' => 'short',
        'new_password_confirmation' => 'short',
    ]);

    $response->assertSessionHasErrors(['new_password']);
    expect(Hash::check('old-password', $user->fresh()->password))->toBeTrue();
});

test('guests cannot change password', function () {
    $response = $this->post('/account/change-password', [
        'current_password' => 'old-password',
        'new_password' => 'new-password',
        'new_password_confirmation' => 'new-password',
    ]);

    $response->assertRedirect(route('login'));
});

test('an authenticated user can revoke one of their other sessions', function () {
    $user = User::factory()->create();
    $currentSessionId = str_repeat('a', 40);

    DB::table('sessions')->insert([
        ['id' => $currentSessionId, 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Current', 'payload' => '', 'last_activity' => now()->timestamp],
        ['id' => 'other-session-id', 'user_id' => $user->id, 'ip_address' => '10.0.0.2', 'user_agent' => 'Other', 'payload' => '', 'last_activity' => now()->timestamp],
    ]);

    $response = $this->withCookie(config('session.cookie'), $currentSessionId)
        ->actingAs($user)
        ->delete('/account/sessions/other-session-id');

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Session has been signed out.');
    $this->assertDatabaseMissing('sessions', ['id' => 'other-session-id']);
    $this->assertDatabaseHas('sessions', ['id' => $currentSessionId]);
});

test('a user cannot revoke their own current session', function () {
    $user = User::factory()->create();
    $currentSessionId = str_repeat('a', 40);

    DB::table('sessions')->insert([
        'id' => $currentSessionId,
        'user_id' => $user->id,
        'ip_address' => '10.0.0.1',
        'user_agent' => 'Current',
        'payload' => '',
        'last_activity' => now()->timestamp,
    ]);

    $response = $this->withCookie(config('session.cookie'), $currentSessionId)
        ->actingAs($user)
        ->delete('/account/sessions/' . $currentSessionId);

    $response->assertSessionHasErrors(['session']);
    $this->assertDatabaseHas('sessions', ['id' => $currentSessionId]);
});

test('a user cannot revoke a session belonging to another user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $currentSessionId = str_repeat('a', 40);

    DB::table('sessions')->insert([
        ['id' => $currentSessionId, 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Current', 'payload' => '', 'last_activity' => now()->timestamp],
        ['id' => 'foreign-session-id', 'user_id' => $otherUser->id, 'ip_address' => '10.0.0.2', 'user_agent' => 'Foreign', 'payload' => '', 'last_activity' => now()->timestamp],
    ]);

    $response = $this->withCookie(config('session.cookie'), $currentSessionId)
        ->actingAs($user)
        ->delete('/account/sessions/foreign-session-id');

    $response->assertSessionHasErrors(['session']);
    $this->assertDatabaseHas('sessions', ['id' => 'foreign-session-id']);
});

test('guests cannot revoke a session', function () {
    $response = $this->delete('/account/sessions/some-session-id');

    $response->assertRedirect(route('login'));
});

test('an authenticated user can sign out of all other sessions', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $currentSessionId = str_repeat('a', 40);

    DB::table('sessions')->insert([
        ['id' => $currentSessionId, 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Current', 'payload' => '', 'last_activity' => now()->timestamp],
        ['id' => 'other-session-1', 'user_id' => $user->id, 'ip_address' => '10.0.0.2', 'user_agent' => 'Other 1', 'payload' => '', 'last_activity' => now()->timestamp],
        ['id' => 'other-session-2', 'user_id' => $user->id, 'ip_address' => '10.0.0.3', 'user_agent' => 'Other 2', 'payload' => '', 'last_activity' => now()->timestamp],
        ['id' => 'foreign-session', 'user_id' => $otherUser->id, 'ip_address' => '10.0.0.4', 'user_agent' => 'Foreign', 'payload' => '', 'last_activity' => now()->timestamp],
    ]);

    $response = $this->withCookie(config('session.cookie'), $currentSessionId)
        ->actingAs($user)
        ->delete('/account/sessions');

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Signed out of all other sessions.');
    $this->assertDatabaseHas('sessions', ['id' => $currentSessionId]);
    $this->assertDatabaseMissing('sessions', ['id' => 'other-session-1']);
    $this->assertDatabaseMissing('sessions', ['id' => 'other-session-2']);
    $this->assertDatabaseHas('sessions', ['id' => 'foreign-session']);
});

test('guests cannot sign out of all other sessions', function () {
    $response = $this->delete('/account/sessions');

    $response->assertRedirect(route('login'));
});

test('an authenticated user can update their session lifetime to an allowed value', function () {
    $user = User::factory()->create(['session_lifetime' => 480]);

    $response = $this->actingAs($user)->post('/account/session-lifetime/1440');

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Session lifetime has been updated.');
    $this->assertDatabaseHas('users', ['id' => $user->id, 'session_lifetime' => 1440]);
});

test('updating session lifetime rejects a value outside the allowed list', function () {
    $user = User::factory()->create(['session_lifetime' => 480]);

    $response = $this->actingAs($user)->post('/account/session-lifetime/999');

    $response->assertSessionHasErrors(['lifetime']);
    $this->assertDatabaseHas('users', ['id' => $user->id, 'session_lifetime' => 480]);
});

test('guests cannot update session lifetime', function () {
    $response = $this->post('/account/session-lifetime/1440');

    $response->assertRedirect(route('login'));
});
