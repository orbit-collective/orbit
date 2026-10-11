<?php

namespace Tests;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

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

    protected function setUp(): void
    {
        parent::setUp();

        // Redis serialises what it stores and, with `serializable_classes`
        // off in config/cache.php, hands objects back as incomplete classes.
        // The array store keeps objects as they are unless told to serialise,
        // which would let a cached Eloquent model pass here and fail in
        // production, so tests run it the way Redis behaves.
        config(['cache.stores.array.serialize' => true]);
        Cache::forgetDriver('array');
    }
}
