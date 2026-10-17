<?php

namespace App\Repositories;

use App\Enums\AutomationActionType;
use App\Enums\IntegrationFieldMappingType;
use App\Models\AutomationAction;
use App\Models\IntegrationFieldMapping;
use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use App\Models\Label;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class LabelRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->labels()->orderByDesc('is_system')->orderBy('name')->get();
    }

    public function findForProject(Project $project, string $name): ?Label
    {
        return $project->labels()->where('name', $name)->first();
    }

    public function firstOrCreateSystemLabel(Project $project, array $definition): Label
    {
        return $project->labels()->firstOrCreate(
            ['name' => $definition['name']],
            [
                'color' => $definition['color'],
                'description' => $definition['description'] ?? null,
                'is_system' => true,
            ],
        );
    }

    public function create(Project $project, array $data): Label
    {
        return $project->labels()->create($data);
    }

    public function update(Label $label, array $data): Label
    {
        $label->update($data);

        return $label;
    }

    public function delete(Label $label): void
    {
        $label->delete();
    }

    /**
     * Rewrites (or, with a null `$to`, removes) a label name in the places that
     * still keep it as plain text - template defaults, Jira
     * label mappings, and add/remove-label automation actions - so a rename or
     * delete does not leave them pointing at a name that no longer exists.
     * Issues are not among them: they reference the label by id.
     */
    public function replaceNameReferences(Project $project, string $from, ?string $to): void
    {
        $swap = fn (?array $names) => collect($names ?? [])
            ->map(fn ($name) => $name === $from ? $to : $name)
            ->filter()
            ->unique()
            ->values()
            ->all();

        IssueTypeTemplate::query()
            ->whereIn('issue_type_id', IssueType::query()->where('project_id', $project->id)->select('id'))
            ->get()
            ->filter(fn (IssueTypeTemplate $template) => in_array($from, $template->default_labels ?? [], true))
            ->each(fn (IssueTypeTemplate $template) => $template->update(['default_labels' => $swap($template->default_labels)]));

        $integrationIds = $project->integrations()->select('id');

        $mappings = IntegrationFieldMapping::query()
            ->whereIn('project_integration_id', $integrationIds)
            ->where('mapping_type', IntegrationFieldMappingType::LABEL)
            ->where('orbit_value', $from);

        $to === null ? $mappings->delete() : $mappings->update(['orbit_value' => $to]);

        AutomationAction::query()
            ->whereIn('type', [AutomationActionType::AddLabel->value, AutomationActionType::RemoveLabel->value])
            ->whereHas('rule', fn ($rule) => $rule->where('project_id', $project->id))
            ->get()
            ->filter(fn (AutomationAction $action) => ($action->params['label'] ?? null) === $from)
            ->each(function (AutomationAction $action) use ($to) {
                $to === null
                    ? $action->delete()
                    : $action->update(['params' => [...$action->params, 'label' => $to]]);
            });
    }
}
