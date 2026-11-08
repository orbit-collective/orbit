<?php

use App\Models\DashboardLayout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function layoutPayload(array $overrides = []): array
{
    return ['widgets' => [array_merge([
        'id' => 'w1',
        'type' => 'projects',
        'variant' => 'compact',
        'width' => 60,
        'height' => 100,
        'visible' => true,
        'config' => ['limit' => 5],
    ], $overrides)]];
}

test('guests cannot change the dashboard layout', function () {
    $this->put('/dashboard/layout', layoutPayload())->assertRedirect(route('login'));
    $this->delete('/dashboard/layout')->assertRedirect(route('login'));
});

test('a user saves a layout and the dashboard serves it', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->from('/')->put('/dashboard/layout', layoutPayload())->assertRedirect('/');

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('dashboardLayout.widgets', 1)
        ->where('dashboardLayout.widgets.0.type', 'projects')
        ->where('dashboardLayout.widgets.0.variant', 'compact')
        ->where('dashboardLayout.widgets.0.config.limit', 5)
        ->has('dashboardLayout.catalog', 9)
    );
});

test('the layout of one user does not touch another one', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)->put('/dashboard/layout', layoutPayload());

    expect(DashboardLayout::query()->where('user_id', $other->id)->exists())->toBeFalse();

    $this->actingAs($other)->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('dashboardLayout.widgets', 9)
    );
});

test('an empty layout is a valid one', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put('/dashboard/layout', ['widgets' => []])->assertSessionHasNoErrors();

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page->has('dashboardLayout.widgets', 0));
});

test('reset brings the default layout back', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->put('/dashboard/layout', layoutPayload());

    $this->actingAs($user)->delete('/dashboard/layout')->assertRedirect();

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page->has('dashboardLayout.widgets', 9));
});

test('invalid layouts are rejected', function (array $payload, string $errorKey) {
    $user = User::factory()->create();

    $this->actingAs($user)->put('/dashboard/layout', $payload)->assertSessionHasErrors($errorKey);

    expect(DashboardLayout::query()->count())->toBe(0);
})->with([
    'no widgets key' => [[], 'widgets'],
    'unknown type' => [layoutPayload(['type' => 'nope']), 'widgets.0.type'],
    'variant of another type' => [layoutPayload(['variant' => 'ring']), 'widgets.0.variant'],
    'narrower than the type allows' => [layoutPayload(['width' => 29]), 'widgets.0.width'],
    'wider than the grid' => [layoutPayload(['width' => 121]), 'widgets.0.width'],
    'width that is not a number' => [layoutPayload(['width' => 'wide']), 'widgets.0.width'],
    'shorter than the type allows' => [layoutPayload(['height' => 39]), 'widgets.0.height'],
    'taller than allowed' => [layoutPayload(['height' => 401]), 'widgets.0.height'],
    'unknown option' => [layoutPayload(['config' => ['color' => 'red']]), 'widgets.0.config.color'],
    'option value not allowed' => [layoutPayload(['config' => ['limit' => 7]]), 'widgets.0.config.limit'],
    'option value of another option' => [layoutPayload(['config' => ['limit' => 'latest']]), 'widgets.0.config.limit'],
    'bad id' => [layoutPayload(['id' => 'a b']), 'widgets.0.id'],
    'missing visibility' => [layoutPayload(['visible' => null]), 'widgets.0.visible'],
]);

test('repeated ids are rejected', function () {
    $user = User::factory()->create();
    $widgets = array_merge(layoutPayload()['widgets'], layoutPayload()['widgets']);

    $this->actingAs($user)->put('/dashboard/layout', ['widgets' => $widgets])->assertSessionHasErrors('widgets.0.id');
});

test('too many widgets are rejected', function () {
    $user = User::factory()->create();
    $widgets = collect(range(1, 31))->map(fn ($i) => layoutPayload(['id' => "w$i"])['widgets'][0])->all();

    $this->actingAs($user)->put('/dashboard/layout', ['widgets' => $widgets])->assertSessionHasErrors('widgets');
});

test('the dashboard sends only the data the visible widgets read, the rest on request', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->put('/dashboard/layout', layoutPayload(['type' => 'stat_open_issues', 'variant' => 'default', 'width' => 30, 'height' => 32, 'config' => []]));

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('issueStats')
        ->has('projects')
        ->missing('productivity_trend')
        ->missing('activityLogs')
        ->missing('issueTypes')
        ->missing('users')
    );

    $this->actingAs($user)
        ->get('/', ['X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'Dashboard', 'X-Inertia-Partial-Data' => 'productivity_trend,activityLogs', 'X-Inertia-Version' => Inertia::getVersion()])
        ->assertJsonStructure(['props' => ['productivity_trend', 'activityLogs']]);
});
