<?php

namespace App\Services;

use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use App\Repositories\IssueTypeTemplateRepository;
use Illuminate\Validation\ValidationException;

class IssueTypeTemplateService
{
    public function __construct(
        protected IssueTypeTemplateRepository $issueTypeTemplateRepository,
        protected ActivityLogService $activityLogService,
        protected PriorityService $priorityService,
    ) {}

    public function createTemplate(IssueType $issueType, array $data): IssueTypeTemplate
    {
        $this->assertNameAvailable($issueType, $data['name']);

        $template = $this->issueTypeTemplateRepository->create($issueType, [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'default_priority' => $this->canonicalPriority($issueType, $data['default_priority'] ?? null),
            'default_labels' => $data['default_labels'] ?? [],
        ]);

        $this->activityLogService->log($issueType->project_id, "Added the \"$template->name\" template to the \"$issueType->name\" issue type");

        return $template;
    }

    public function updateTemplate(IssueType $issueType, IssueTypeTemplate $template, array $data): IssueTypeTemplate
    {
        if (array_key_exists('name', $data) && $data['name'] !== $template->name) {
            $this->assertNameAvailable($issueType, $data['name']);
        }

        if (array_key_exists('default_priority', $data)) {
            $data['default_priority'] = $this->canonicalPriority($issueType, $data['default_priority']);
        }

        $template = $this->issueTypeTemplateRepository->update($template, $data);

        $this->activityLogService->log($issueType->project_id, "Updated the \"$template->name\" template on the \"$issueType->name\" issue type");

        return $template;
    }

    /**
     * A template keeps its default priority as the priority's name; the name
     * the caller typed is stored as the project's own spelling of it, so a
     * later rename finds it, and a name the project does not have is dropped.
     */
    private function canonicalPriority(IssueType $issueType, ?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        return $this->priorityService->findByName($issueType->project, $name)?->name;
    }

    public function deleteTemplate(IssueType $issueType, IssueTypeTemplate $template): void
    {
        $name = $template->name;

        $this->issueTypeTemplateRepository->delete($template);

        $this->activityLogService->log($issueType->project_id, "Removed the \"$name\" template from the \"$issueType->name\" issue type");
    }

    private function assertNameAvailable(IssueType $issueType, string $name): void
    {
        if ($this->issueTypeTemplateRepository->findForType($issueType, $name)) {
            throw ValidationException::withMessages([
                'name' => 'A template with this name already exists for this issue type.',
            ]);
        }
    }
}
