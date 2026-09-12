<?php

use App\Models\IssueType;
use App\Services\IssueTypeTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(IssueTypeTemplateService::class);
});

test('it can create a template and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);

    $template = $this->service->createTemplate($issueType, [
        'name' => 'Standard Bug Report',
        'description' => 'Steps to reproduce...',
        'default_priority' => 'high',
        'default_labels' => ['bug'],
    ]);

    $this->assertDatabaseHas('issue_type_templates', ['id' => $template->id, 'name' => 'Standard Bug Report']);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Added the "Standard Bug Report" template to the "Bug" issue type']);
});

test('it rejects creating a template with a name already used on the issue type', function () {
    $issueType = IssueType::factory()->create();
    $issueType->templates()->create(['name' => 'Standard']);

    $this->service->createTemplate($issueType, ['name' => 'Standard']);
})->throws(ValidationException::class);

test('it can update a template and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $template = $issueType->templates()->create(['name' => 'Standard']);

    $updated = $this->service->updateTemplate($issueType, $template, ['name' => 'Detailed']);

    expect($updated->name)->toBe('Detailed');
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Updated the "Detailed" template on the "Bug" issue type']);
});

test('it can delete a template and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $template = $issueType->templates()->create(['name' => 'Standard']);

    $this->service->deleteTemplate($issueType, $template);

    $this->assertDatabaseMissing('issue_type_templates', ['id' => $template->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Removed the "Standard" template from the "Bug" issue type']);
});
