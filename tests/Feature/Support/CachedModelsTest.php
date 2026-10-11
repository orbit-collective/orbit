<?php

use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use App\Support\Cache\CachedModels;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('models survive a cache round trip that refuses to unserialize objects', function () {
    $projects = Project::factory()->count(2)->create();

    $rows = unserialize(serialize(CachedModels::toRows($projects)), ['allowed_classes' => false]);
    $hydrated = CachedModels::hydrate(Project::class, $rows);

    expect($hydrated)->toHaveCount(2)
        ->and($hydrated->first())->toBeInstanceOf(Project::class)
        ->and($hydrated->first()->exists)->toBeTrue()
        ->and($hydrated->pluck('id')->all())->toBe($projects->pluck('id')->all())
        ->and($hydrated->first()->name)->toBe($projects->first()->name);
});

test('casts still apply to hydrated models', function () {
    $notification = Notification::factory()->create(['user_id' => User::factory()->create()->id]);

    $rows = unserialize(serialize(CachedModels::toRows(collect([$notification])->toBase()->pipe(fn ($c) => new Collection($c->all())))), ['allowed_classes' => false]);
    $hydrated = CachedModels::hydrate(Notification::class, $rows)->first();

    expect($hydrated->notification_type)->toBe($notification->notification_type);
});

test('an empty list stays an empty collection', function () {
    expect(CachedModels::hydrate(Project::class, CachedModels::toRows(new Collection)))->toBeEmpty();
});
