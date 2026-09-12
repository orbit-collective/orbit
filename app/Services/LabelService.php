<?php

namespace App\Services;

use App\Models\Label;
use App\Models\Project;
use App\Repositories\LabelRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class LabelService
{
    /**
     * The starter taxonomy every project gets on first use. Projects created
     * before this system existed are backfilled lazily the first time their
     * labels are read (see ensureSystemLabels()) rather than through a data
     * migration, so this list is the single source of truth for what "system
     * label" means - editing it only affects projects that haven't been
     * seeded yet.
     */
    private const array SYSTEM_LABELS = [
        ['name' => 'bug', 'color' => '#f44336', 'description' => 'Something isn’t working as expected.'],
        ['name' => 'feature', 'color' => '#2196f3', 'description' => 'A new capability or request.'],
        ['name' => 'performance', 'color' => '#9c27b0', 'description' => 'Related to speed, load, or resource usage.'],
        ['name' => 'design', 'color' => '#00bcd4', 'description' => 'Visual, layout, or interaction design work.'],
        ['name' => 'ux', 'color' => '#009688', 'description' => 'Usability and user-experience concerns.'],
        ['name' => 'chore', 'color' => '#e91e63', 'description' => 'Maintenance work with no direct user impact.'],
    ];

    public function __construct(
        protected LabelRepository $labelRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * Seeds the project's system labels exactly once, the first time this is
     * called for the project. Guarded by projects.labels_seeded_at rather
     * than "insert whatever's missing" - the latter would silently resurrect
     * a system label an owner deliberately deleted the next time any issue
     * is created or edited.
     */
    public function ensureSystemLabels(Project $project): void
    {
        if ($project->labels_seeded_at !== null) {
            return;
        }

        foreach (self::SYSTEM_LABELS as $definition) {
            $this->labelRepository->firstOrCreateSystemLabel($project, $definition);
        }

        $project->forceFill(['labels_seeded_at' => now()])->save();
    }

    public function getLabels(Project $project): Collection
    {
        $this->ensureSystemLabels($project);

        return $this->labelRepository->getForProject($project);
    }

    public function createLabel(Project $project, array $data): Label
    {
        $this->assertNameAvailable($project, $data['name']);

        $label = $this->labelRepository->create($project, [
            'name' => $data['name'],
            'color' => $data['color'],
            'description' => $data['description'] ?? null,
            'is_system' => false,
        ]);

        $this->activityLogService->log($project->id, "Created the \"$label->name\" label");

        return $label;
    }

    public function updateLabel(Project $project, Label $label, array $data): Label
    {
        if (array_key_exists('name', $data) && $data['name'] !== $label->name) {
            $this->assertNameAvailable($project, $data['name']);
        }

        $label = $this->labelRepository->update($label, $data);

        $this->activityLogService->log($project->id, "Updated the \"$label->name\" label");

        return $label;
    }

    public function deleteLabel(Project $project, Label $label): void
    {
        $this->labelRepository->delete($label);

        $this->activityLogService->log($project->id, "Deleted the \"$label->name\" label");
    }

    private function assertNameAvailable(Project $project, string $name): void
    {
        if ($this->labelRepository->findForProject($project, $name)) {
            throw ValidationException::withMessages([
                'name' => 'A label with this name already exists in this project.',
            ]);
        }
    }
}
