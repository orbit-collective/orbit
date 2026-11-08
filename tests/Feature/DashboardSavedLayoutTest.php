<?php

use App\Models\DashboardSavedLayout;
use App\Models\User;
use App\Services\DashboardSavedLayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function savedLayoutPayload(string $name = 'Focus', array $overrides = []): array
{
    return [
        'name' => $name,
        'widgets' => [array_merge([
            'id' => 'w1',
            'type' => 'trend',
            'variant' => 'line',
            'width' => 80,
            'height' => 90,
            'visible' => true,
            'config' => ['grid' => 'off'],
        ], $overrides)],
    ];
}

test('guests cannot save or delete layouts', function () {
    $this->post('/dashboard/saved-layouts', savedLayoutPayload())->assertRedirect(route('login'));
    $this->delete('/dashboard/saved-layouts/1')->assertRedirect(route('login'));
});

test('a user saves the layout and the dashboard lists it', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->from('/')->post('/dashboard/saved-layouts', savedLayoutPayload())->assertRedirect('/');

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('savedLayouts', 1)
        ->where('savedLayouts.0.name', 'Focus')
        ->where('savedLayouts.0.widgets.0.variant', 'line')
        ->where('savedLayouts.0.widgets.0.config.grid', 'off')
        // Options that were not sent come back with their defaults.
        ->where('savedLayouts.0.widgets.0.config.today', 'on')
    );
});

test('the name is trimmed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('  Focus  '))->assertSessionHasNoErrors();

    expect(DashboardSavedLayout::query()->where('user_id', $user->id)->value('name'))->toBe('Focus');
});

test('saving under a name that exists replaces that layout', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus', ['variant' => 'area']));

    expect(DashboardSavedLayout::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and(DashboardSavedLayout::query()->first()->widgets[0]['variant'])->toBe('area');
});

test('two users can use the same name', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();

    $this->actingAs($a)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $this->actingAs($b)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'))->assertSessionHasNoErrors();

    expect(DashboardSavedLayout::query()->count())->toBe(2);

    $this->actingAs($b)->get('/')->assertInertia(fn (Assert $page) => $page->has('savedLayouts', 1));
});

test('the newest layout comes first', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Old'));
    $this->travel(1)->minutes();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('New'));

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('savedLayouts.0.name', 'New')
        ->where('savedLayouts.1.name', 'Old')
    );
});

test('invalid layouts are rejected', function (array $payload, string $errorKey) {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/dashboard/saved-layouts', $payload)->assertSessionHasErrors($errorKey);

    expect(DashboardSavedLayout::query()->count())->toBe(0);
})->with([
    'no name' => [['widgets' => []], 'name'],
    'empty name' => [['name' => '   ', 'widgets' => []], 'name'],
    'name too long' => [['name' => str_repeat('a', 41), 'widgets' => []], 'name'],
    'no widgets' => [['name' => 'Focus'], 'widgets'],
    'unknown type' => [savedLayoutPayload('Focus', ['type' => 'nope']), 'widgets.0.type'],
    'too narrow' => [savedLayoutPayload('Focus', ['width' => 1]), 'widgets.0.width'],
]);

test('a user can keep only so many layouts, but may still replace one', function () {
    $user = User::factory()->create();
    $service = app(DashboardSavedLayoutService::class);

    foreach (range(1, DashboardSavedLayoutService::MAX_PER_USER) as $i) {
        $service->save($user->id, "Layout $i", []);
    }

    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('One too many'))
        ->assertSessionHasErrors('name');
    expect(DashboardSavedLayout::query()->count())->toBe(DashboardSavedLayoutService::MAX_PER_USER);

    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Layout 3'))
        ->assertSessionHasNoErrors();
    expect(DashboardSavedLayout::query()->count())->toBe(DashboardSavedLayoutService::MAX_PER_USER);
});

test('a user deletes their own layout', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload());
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->delete("/dashboard/saved-layouts/$id")->assertRedirect();

    expect(DashboardSavedLayout::query()->count())->toBe(0);
});

test('the layout of another user cannot be deleted', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $this->actingAs($owner)->post('/dashboard/saved-layouts', savedLayoutPayload());
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($other)->delete("/dashboard/saved-layouts/$id")->assertNotFound();

    expect(DashboardSavedLayout::query()->count())->toBe(1);
});

test('a saved layout is normalised on its way out', function () {
    $user = User::factory()->create();
    DashboardSavedLayout::query()->create([
        'user_id' => $user->id,
        'name' => 'Old',
        'widgets' => [
            ['id' => 'a', 'type' => 'removed_type'],
            ['id' => 'b', 'type' => 'trend', 'variant' => 'gone', 'span' => 6],
        ],
    ]);

    $widgets = app(DashboardSavedLayoutService::class)->listFor($user->id)[0]['widgets'];

    expect($widgets)->toHaveCount(1)
        ->and($widgets[0])->toMatchArray(['id' => 'b', 'variant' => 'bars', 'width' => 60]);
});

test('deleting a user deletes their saved layouts', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload());

    $user->delete();

    expect(DashboardSavedLayout::query()->count())->toBe(0);
});

test('a user renames a saved layout', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", ['name' => '  Deep work  '])->assertSessionHasNoErrors();

    $layout = DashboardSavedLayout::query()->find($id);
    expect($layout->name)->toBe('Deep work')
        // The widgets are left alone.
        ->and($layout->widgets[0]['variant'])->toBe('line');
});

test('a layout can keep its own name when it is updated', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", ['name' => 'Focus'])->assertSessionHasNoErrors();
});

test('a layout cannot take the name of another one', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Overview'));
    $id = DashboardSavedLayout::query()->where('name', 'Focus')->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", ['name' => 'Overview'])->assertSessionHasErrors('name');

    expect(DashboardSavedLayout::query()->find($id)->name)->toBe('Focus');
});

test('the widgets of a saved layout can be replaced', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", [
        'widgets' => savedLayoutPayload('x', ['type' => 'projects', 'variant' => 'grid', 'width' => 60, 'height' => 100, 'config' => ['limit' => 5]])['widgets'],
    ])->assertSessionHasNoErrors();

    $layout = DashboardSavedLayout::query()->find($id);
    expect($layout->name)->toBe('Focus')
        ->and($layout->widgets[0])->toMatchArray(['type' => 'projects', 'variant' => 'grid'])
        ->and($layout->widgets[0]['config']['limit'])->toBe(5);
});

test('renaming and replacing can happen together', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", savedLayoutPayload('Wide', ['variant' => 'area']))
        ->assertSessionHasNoErrors();

    $layout = DashboardSavedLayout::query()->find($id);
    expect($layout->name)->toBe('Wide')->and($layout->widgets[0]['variant'])->toBe('area');
});

test('an update needs a name or widgets and valid ones', function (array $payload, string $errorKey) {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($user)->patch("/dashboard/saved-layouts/$id", $payload)->assertSessionHasErrors($errorKey);
})->with([
    'nothing' => [[], 'name'],
    'blank name' => [['name' => '   '], 'name'],
    'name too long' => [['name' => str_repeat('a', 41)], 'name'],
    'invalid widget' => [['widgets' => savedLayoutPayload('x', ['type' => 'nope'])['widgets']], 'widgets.0.type'],
]);

test('the layout of another user cannot be updated', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $this->actingAs($owner)->post('/dashboard/saved-layouts', savedLayoutPayload('Focus'));
    $id = DashboardSavedLayout::query()->value('id');

    $this->actingAs($other)->patch("/dashboard/saved-layouts/$id", ['name' => 'Mine'])->assertNotFound();

    expect(DashboardSavedLayout::query()->find($id)->name)->toBe('Focus');
});

test('guests cannot update a layout', function () {
    $this->patch('/dashboard/saved-layouts/1', ['name' => 'x'])->assertRedirect(route('login'));
});
