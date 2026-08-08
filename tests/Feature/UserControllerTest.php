<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
