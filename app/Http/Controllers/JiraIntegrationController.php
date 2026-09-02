<?php

namespace App\Http\Controllers;

use App\Enums\IntegrationFieldMappingType;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\Jira\JiraIntegrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JiraIntegrationController extends Controller
{
    public function __construct(
        protected JiraIntegrationService $jiraIntegrationService,
        protected ProjectIntegrationRepository $projectIntegrationRepository,
    ) {}

    public function connect(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'instance_url' => ['required', 'string', 'url', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'api_token' => ['required', 'string', 'max:255'],
        ]);

        $this->jiraIntegrationService->connect($project, $validated);

        return redirect()->back()->with('success', 'Connected to Jira.');
    }

    public function updateMappings(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.mapping_type' => ['required', Rule::enum(IntegrationFieldMappingType::class)],
            'mappings.*.external_value' => ['required', 'string', 'max:255'],
            'mappings.*.external_label' => ['nullable', 'string', 'max:255'],
            'mappings.*.orbit_value' => ['required', 'string', 'max:255'],
        ]);

        $projectIntegration = $this->findConnectedIntegration($project);

        $this->jiraIntegrationService->saveMappings($projectIntegration, $validated['mappings']);

        return redirect()->back()->with('success', 'Jira field mappings updated.');
    }

    public function import(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'project_key' => ['required', 'string', 'max:255'],
        ]);

        $projectIntegration = $this->findConnectedIntegration($project);

        $this->jiraIntegrationService->triggerImport(
            $project, $projectIntegration, $request->user(), ['project_key' => $validated['project_key']],
        );

        return redirect()->back()->with('success', 'Jira import started — this can take a few minutes.');
    }

    private function findConnectedIntegration(Project $project): ProjectIntegration
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'jira');

        abort_if(! $projectIntegration || empty($projectIntegration->credentials), 404, 'Jira is not connected for this project.');

        return $projectIntegration;
    }
}
