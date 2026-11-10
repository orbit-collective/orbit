<?php

use App\Models\IssueType;
use App\Models\Priority;

function renameAlertIconsMigration(): object
{
    return require database_path('migrations/2026_11_11_120000_rename_lucide_alert_icons.php');
}

test('it renames the removed lucide icons of priorities and issue types', function () {
    $priority = Priority::factory()->create(['icon' => 'TriangleAlert']);
    $other = Priority::factory()->create(['icon' => 'Flag']);
    $type = IssueType::factory()->create(['icon' => 'ShieldAlert']);

    renameAlertIconsMigration()->up();

    expect($priority->fresh()->icon)->toBe('TriangleExclamationPoint')
        ->and($other->fresh()->icon)->toBe('Flag')
        ->and($type->fresh()->icon)->toBe('ShieldExclamationPoint');
});

test('it can be rolled back', function () {
    $priority = Priority::factory()->create(['icon' => 'CircleExclamationPoint']);

    renameAlertIconsMigration()->down();

    expect($priority->fresh()->icon)->toBe('CircleAlert');
});
