<?php

use App\Enums\Dashboard\DashboardWidgetType;
use App\Models\DashboardLayout;
use App\Models\User;
use App\Services\DashboardLayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(DashboardLayoutService::class);
});

test('a user without a saved layout gets the default one with every widget type', function () {
    $user = User::factory()->create();

    $widgets = $this->service->widgetsFor($user->id);

    expect(collect($widgets)->pluck('type')->sort()->values()->all())
        ->toEqual(collect(DashboardWidgetType::cases())->pluck('value')->sort()->values()->all())
        ->and(collect($widgets)->every(fn ($widget) => $widget['visible']))->toBeTrue()
        ->and($widgets[0])->toMatchArray(['id' => 'stat_projects', 'variant' => 'default', 'span' => 3]);
});

test('saving stores the layout and widgetsFor reads it back', function () {
    $user = User::factory()->create();

    $this->service->save($user->id, [
        ['id' => 'a', 'type' => 'trend', 'variant' => 'default', 'span' => 12, 'visible' => true, 'config' => []],
        ['id' => 'b', 'type' => 'projects', 'variant' => 'compact', 'span' => 6, 'visible' => false, 'config' => ['limit' => 5]],
    ]);

    expect(DashboardLayout::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and($this->service->widgetsFor($user->id))->toEqual([
            ['id' => 'a', 'type' => 'trend', 'variant' => 'default', 'span' => 12, 'visible' => true, 'config' => []],
            ['id' => 'b', 'type' => 'projects', 'variant' => 'compact', 'span' => 6, 'visible' => false, 'config' => ['limit' => 5]],
        ]);
});

test('saving twice updates the single layout row of the user', function () {
    $user = User::factory()->create();

    $this->service->save($user->id, [['id' => 'a', 'type' => 'trend']]);
    $this->service->save($user->id, [['id' => 'b', 'type' => 'activity']]);

    expect(DashboardLayout::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and(collect($this->service->widgetsFor($user->id))->pluck('id')->all())->toBe(['b']);
});

test('reset drops the saved layout and brings the default back', function () {
    $user = User::factory()->create();
    $this->service->save($user->id, [['id' => 'a', 'type' => 'trend']]);

    $this->service->reset($user->id);

    expect(DashboardLayout::query()->where('user_id', $user->id)->exists())->toBeFalse()
        ->and($this->service->widgetsFor($user->id))->toEqual($this->service->defaultWidgets());
});

test('normalize drops unknown types and falls back to the defaults of the type', function () {
    $widgets = $this->service->normalize([
        ['id' => 'x', 'type' => 'does_not_exist'],
        'not an array',
        ['id' => 'ok', 'type' => 'completion', 'variant' => 'pie', 'span' => 5, 'visible' => 0, 'config' => ['limit' => 3]],
        ['id' => 'p', 'type' => 'projects', 'config' => ['limit' => 99]],
    ]);

    expect($widgets)->toHaveCount(2)
        ->and($widgets[0])->toEqual(['id' => 'ok', 'type' => 'completion', 'variant' => 'bars', 'span' => 4, 'visible' => false, 'config' => []])
        ->and($widgets[1]['config'])->toBe(['limit' => 3]);
});

test('normalize replaces invalid and repeated ids', function () {
    $widgets = $this->service->normalize([
        ['id' => 'same', 'type' => 'trend'],
        ['id' => 'same', 'type' => 'activity'],
        ['id' => 'bad id!', 'type' => 'projects'],
        ['type' => 'completion'],
    ]);

    $ids = collect($widgets)->pluck('id');

    expect($ids->first())->toBe('same')
        ->and($ids->unique())->toHaveCount(4);
});

test('normalize keeps at most the maximum number of widgets', function () {
    $widgets = $this->service->normalize(array_fill(0, DashboardLayoutService::MAX_WIDGETS + 5, ['type' => 'trend']));

    expect($widgets)->toHaveCount(DashboardLayoutService::MAX_WIDGETS);
});

test('requiredProps lists what the visible widgets read and ignores hidden ones', function () {
    $props = $this->service->requiredProps($this->service->normalize([
        ['id' => 'a', 'type' => 'stat_open_issues'],
        ['id' => 'b', 'type' => 'completion'],
        ['id' => 'c', 'type' => 'activity', 'visible' => false],
        ['id' => 'd', 'type' => 'trend', 'visible' => false],
    ]));

    expect($props)->toBe(['issueStats']);
});

test('every widget type describes itself consistently for the editor', function () {
    foreach (DashboardWidgetType::catalog() as $entry) {
        $type = DashboardWidgetType::from($entry['type']);

        expect($entry['spans'])->toContain($entry['defaultSpan'])
            ->and($entry['variants'])->not->toBeEmpty()
            ->and($entry['props'])->not->toBeEmpty()
            ->and(array_diff($entry['spans'], DashboardWidgetType::SPANS))->toBeEmpty();

        foreach ($type->options() as $option) {
            expect($option['options'])->toContain($option['default']);
        }
    }
});
