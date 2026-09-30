<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('rolling back the github_oauth migration backfills a password for passwordless accounts', function () {
    $githubOnlyUser = User::factory()->create(['password' => null, 'github_id' => '123']);
    $regularUser = User::factory()->create(['password' => 'secret123']);
    $regularUserOriginalPassword = $regularUser->password;

    $migration = require database_path('migrations/2026_09_30_090000_add_github_oauth_to_users_table.php');

    // down() must be able to complete without throwing, even though a
    // passwordless row exists, and without touching an already-set password.
    $migration->down();

    expect($githubOnlyUser->fresh()->password)->not->toBeNull();
    expect($regularUser->fresh()->password)->toBe($regularUserOriginalPassword);
    expect(Schema::hasColumn('users', 'github_id'))->toBeFalse();
});
