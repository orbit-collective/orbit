<?php

namespace App\Services;

use App\Models\Issue;
use App\Models\Project;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectRepository;
use App\Repositories\UserRepository;

class CommandPaletteSearchService
{
    public const ISSUE_LIMIT = 8;

    public const PROJECT_LIMIT = 5;

    public const PEOPLE_LIMIT = 8;

    public function __construct(
        protected IssueRepository $issueRepository,
        protected ProjectRepository $projectRepository,
        protected UserRepository $userRepository,
    ) {}

    /**
     * "#12" is a pure number lookup, a bare "12" is a number lookup plus a
     * title search (a title can start with digits), and anything else is a
     * title search. A "#" in front of free text only marks "issues" and is
     * dropped. Projects are only searched for free text. A leading "@" searches
     * people (members of the user's projects) and nothing else.
     *
     * @return array{issues: list<array<string, mixed>>, projects: list<array<string, mixed>>, people: list<array<string, mixed>>}
     */
    public function search(int $userId, string $query): array
    {
        $query = trim($query);

        if (str_starts_with($query, '@')) {
            return $this->searchPeople($userId, trim(substr($query, 1)));
        }

        $hashed = str_starts_with($query, '#');
        $text = trim($hashed ? substr($query, 1) : $query);

        if ($text === '') {
            return ['issues' => [], 'projects' => [], 'people' => []];
        }

        $isNumber = ctype_digit($text);
        $number = $isNumber ? (int) $text : null;
        $titleQuery = $hashed && $isNumber ? '' : $text;

        $issues = $this->issueRepository->searchForUser($userId, $titleQuery, self::ISSUE_LIMIT, $number);
        $projects = $isNumber || $hashed
            ? collect()
            : $this->projectRepository->searchForUser($userId, $text, self::PROJECT_LIMIT);

        return [
            'issues' => $issues->map(fn (Issue $issue) => $this->issuePayload($issue))->values()->all(),
            'projects' => $projects->map(fn (Project $project) => $this->projectPayload($project))->values()->all(),
            'people' => [],
        ];
    }

    /**
     * @return array{issues: list<array<string, mixed>>, projects: list<array<string, mixed>>, people: list<array<string, mixed>>}
     */
    private function searchPeople(int $userId, string $text): array
    {
        $people = $text === ''
            ? collect()
            : $this->userRepository->searchMembersForUser($userId, $text, self::PEOPLE_LIMIT);

        return [
            'issues' => [],
            'projects' => [],
            'people' => $people->map(fn (object $row) => [
                'id' => $row->user_id,
                'name' => $row->name,
                'avatar' => $row->avatar,
                'project' => ['id' => $row->project_id, 'name' => $row->project_name],
                // The project's issue list with only this person's issues.
                'url' => route('projects.show', ['project' => $row->project_id], false).'?assignee='.$row->user_id,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function issuePayload(Issue $issue): array
    {
        return [
            'id' => $issue->id,
            'number' => $issue->number,
            'title' => $issue->title,
            'url' => route('issues.show', ['project' => $issue->project_id, 'issue' => $issue->id], false),
            'project' => [
                'id' => $issue->project->id,
                'name' => $issue->project->name,
            ],
            'type' => $issue->issueType ? [
                'name' => $issue->issueType->name,
                'icon' => $issue->issueType->icon,
                'color' => $issue->issueType->color,
            ] : null,
            'status' => $issue->workflowStatus ? [
                'name' => $issue->workflowStatus->name,
                'color' => $issue->workflowStatus->color,
            ] : ($issue->status ? ['name' => $issue->status, 'color' => null] : null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function projectPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'slug' => $project->slug,
            'color' => $project->color,
            'url' => route('projects.show', ['project' => $project->id], false),
        ];
    }
}
