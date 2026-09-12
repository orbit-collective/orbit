<?php

use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created issue type template persists with the expected attribute types', function () {
    $template = IssueTypeTemplate::factory()->create();

    expect($template->exists)->toBeTrue()
        ->and($template->name)->toBeString()
        ->and($template->default_labels)->toBeArray();
});

test('issueType() belongs to the issue type referenced by issue_type_id', function () {
    $issueType = IssueType::factory()->create();
    $template = IssueTypeTemplate::factory()->create(['issue_type_id' => $issueType->id]);

    expect($template->issueType())->toBeInstanceOf(BelongsTo::class)
        ->and($template->issueType->id)->toBe($issueType->id);
});

test('deleting an issue type cascades to delete its templates', function () {
    $issueType = IssueType::factory()->create();
    $template = IssueTypeTemplate::factory()->create(['issue_type_id' => $issueType->id]);

    $issueType->delete();

    expect(IssueTypeTemplate::find($template->id))->toBeNull();
});

test('an issue type cannot have two templates with the same name', function () {
    $issueType = IssueType::factory()->create();
    IssueTypeTemplate::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Standard']);

    IssueTypeTemplate::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Standard']);
})->throws(QueryException::class);
