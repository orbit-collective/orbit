<?php

namespace App\Repositories;

use App\Enums\AutomationActionType;
use App\Enums\IntegrationFieldMappingType;
use App\Models\AutomationAction;
use App\Models\IntegrationFieldMapping;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use App\Models\Priority;
use App\Models\Project;
use App\Models\SavedFilter;
use Illuminate\Database\Eloquent\Collection;

class PriorityRepository
{
    /**
     * Takes a write lock on the project row for the rest of the transaction,
     * so overlapping changes to its priority scale run one after the other.
     */
    public function lockProject(Project $project): void
    {
        Project::query()->whereKey($project->id)->lockForUpdate()->first();
    }

    /** @return Collection<int, Priority> */
    public function getForProject(Project $project): Collection
    {
        return $project->priorities()->orderBy('position')->orderBy('id')->get();
    }

    /** @return Collection<int, Priority> each with an `issues_count` */
    public function getForProjectWithIssueCounts(Project $project): Collection
    {
        return $project->priorities()->withCount('issues')->orderBy('position')->orderBy('id')->get();
    }

    public function findForProject(Project $project, int $id): ?Priority
    {
        return $project->priorities()->whereKey($id)->first();
    }

    /** Case-insensitive, so "high" finds the priority named "High". */
    public function findByName(Project $project, string $name): ?Priority
    {
        return $project->priorities()->whereRaw('lower(name) = ?', [mb_strtolower(trim($name))])->first();
    }

    public function findDefault(Project $project): ?Priority
    {
        return $project->priorities()->where('is_default', true)->orderBy('position')->first();
    }

    public function firstOrCreateSystemPriority(Project $project, array $definition): Priority
    {
        return $project->priorities()->firstOrCreate(
            ['name' => $definition['name']],
            [
                'color' => $definition['color'],
                'icon' => $definition['icon'],
                'position' => $definition['position'],
                'is_default' => $definition['is_default'],
            ],
        );
    }

    public function nextPosition(Project $project): int
    {
        $max = $project->priorities()->max('position');

        return $max === null ? 0 : ((int) $max) + 1;
    }

    public function create(Project $project, array $data): Priority
    {
        return $project->priorities()->create($data);
    }

    public function update(Priority $priority, array $data): Priority
    {
        $priority->update($data);

        return $priority;
    }

    public function delete(Priority $priority): void
    {
        $priority->delete();
    }

    /**
     * Points every issue on `$from` at `$to` (or at no priority). One bulk
     * UPDATE, so no model event retires the cached issue lists - the caller
     * bumps CacheVersion::ISSUES once it is done.
     */
    public function moveIssues(Priority $from, ?Priority $to): void
    {
        Issue::query()->where('priority_id', $from->id)->update(['priority_id' => $to?->id]);
    }

    /** Closes the gap a deleted priority leaves: positions become 0, 1, 2, ... in the existing order. */
    public function repackPositions(Project $project): void
    {
        $this->getForProject($project)->values()->each(function (Priority $priority, int $position) {
            if ($priority->position !== $position) {
                $priority->update(['position' => $position]);
            }
        });
    }

    /**
     * Rewrites (or, with a null `$to`, removes) a priority name in the places
     * that keep it as plain text - template defaults, Jira priority mappings
     * and change-priority automation actions - so a rename or delete does not
     * leave them naming a priority that is gone. Issues and saved filters
     * reference it by id and are not among them. Names compare
     * case-insensitively, as everywhere else.
     */
    public function replaceNameReferences(Project $project, string $from, ?string $to): void
    {
        $same = fn (?string $name) => $name !== null && mb_strtolower($name) === mb_strtolower($from);

        IssueTypeTemplate::query()
            ->whereIn('issue_type_id', IssueType::query()->where('project_id', $project->id)->select('id'))
            ->get()
            ->filter(fn (IssueTypeTemplate $template) => $same($template->default_priority))
            ->each(fn (IssueTypeTemplate $template) => $template->update(['default_priority' => $to]));

        IntegrationFieldMapping::query()
            ->whereIn('project_integration_id', $project->integrations()->select('id'))
            ->where('mapping_type', IntegrationFieldMappingType::PRIORITY)
            ->get()
            ->filter(fn (IntegrationFieldMapping $mapping) => $same($mapping->orbit_value))
            ->each(fn (IntegrationFieldMapping $mapping) => $to === null ? $mapping->delete() : $mapping->update(['orbit_value' => $to]));

        AutomationAction::query()
            ->where('type', AutomationActionType::ChangePriority->value)
            ->whereHas('rule', fn ($rule) => $rule->where('project_id', $project->id))
            ->get()
            ->filter(fn (AutomationAction $action) => $same($action->params['priority'] ?? null))
            ->each(function (AutomationAction $action) use ($to) {
                $to === null
                    ? $action->delete()
                    : $action->update(['params' => [...$action->params, 'priority' => $to]]);
            });
    }

    /** Drops a deleted priority's id from the project's saved priority filters. */
    public function removeFromSavedFilters(Project $project, int $priorityId): void
    {
        SavedFilter::query()->where('project_id', $project->id)->get()->each(function (SavedFilter $filter) use ($priorityId) {
            $params = $filter->query_params ?? [];

            if (! isset($params['priority']) || ! is_string($params['priority'])) {
                return;
            }

            $remaining = array_values(array_filter(
                explode(',', $params['priority']),
                fn (string $id) => $id !== '' && (int) $id !== $priorityId,
            ));

            if (implode(',', $remaining) === $params['priority']) {
                return;
            }

            $remaining === []
                ? $params = array_diff_key($params, ['priority' => true])
                : $params['priority'] = implode(',', $remaining);

            $filter->update(['query_params' => $params]);
        });
    }

    /** Makes the given priority the project's only default. */
    public function makeDefault(Priority $priority): void
    {
        $priority->project->priorities()->whereKeyNot($priority->id)->where('is_default', true)->get()
            ->each(fn (Priority $other) => $other->update(['is_default' => false]));

        if (! $priority->is_default) {
            $priority->update(['is_default' => true]);
        }
    }

    /**
     * Writes the order of a project's priorities: the ids' index becomes the
     * position. Saved one by one (not as a single UPDATE) so the issue lists
     * cached under the issues version are retired by the model events.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorder(Project $project, array $orderedIds): void
    {
        $priorities = $project->priorities()->get()->keyBy('id');

        foreach ($orderedIds as $position => $id) {
            $priorities[$id]->update(['position' => $position]);
        }
    }
}
