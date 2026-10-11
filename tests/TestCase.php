<?php

namespace Tests;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Seed the permissions once, when RefreshDatabase builds the test database,
     * instead of before every test. The rows are committed before any test
     * starts its transaction, so each test still sees them and every rollback
     * leaves them in place.
     */
    protected bool $seed = true;

    protected string $seeder = PermissionSeeder::class;
}
