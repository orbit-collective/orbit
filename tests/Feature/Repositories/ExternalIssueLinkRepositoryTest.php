<?php

use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\ExternalIssueLinkRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = app(ExternalIssueLinkRepository::class);
    $this->project = Project::factory()->create();
    $this->integration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
    ]);
    $this->first = Issue::factory()->create(['project_id' => $this->project->id]);
    $this->second = Issue::factory()->create(['project_id' => $this->project->id]);
});

test('one pull request keeps one link per issue', function () {
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->first->id, 'status' => 'open']);
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->second->id, 'status' => 'open']);

    expect(ExternalIssueLink::query()->count())->toBe(2)
        ->and($this->repository->getFor($this->integration, '10'))->toHaveCount(2);
});

test('upserting the same issue again updates its row instead of adding one', function () {
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->first->id, 'status' => 'open']);
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->first->id, 'status' => 'merged']);

    expect(ExternalIssueLink::query()->count())->toBe(1)
        ->and(ExternalIssueLink::query()->value('status'))->toBe('merged');
});

test('findFor narrows by issue when one is given', function () {
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->first->id]);
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->second->id]);

    expect($this->repository->findFor($this->integration, '10', $this->second->id)->issue_id)->toBe($this->second->id)
        ->and($this->repository->findFor($this->integration, '10', 999999))->toBeNull()
        ->and($this->repository->existsFor($this->integration, '10'))->toBeTrue()
        ->and($this->repository->existsFor($this->integration, '11'))->toBeFalse();
});

test('a link can be deleted on its own', function () {
    $link = $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->first->id]);
    $this->repository->upsertFor($this->integration, '10', ['issue_id' => $this->second->id]);

    $this->repository->delete($link);

    expect($this->repository->getFor($this->integration, '10')->pluck('issue_id')->all())->toBe([$this->second->id]);
});
