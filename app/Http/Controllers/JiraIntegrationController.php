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
            'sync_existing' => ['sometimes', 'boolean'],
        ]);

        $projectIntegration = $this->findConnectedIntegration($project);

        $this->jiraIntegrationService->triggerImport(
            $project, $projectIntegration, $request->user(), [
                'project_key' => $validated['project_key'],
                'sync_existing' => $validated['sync_existing'] ?? false,
            ],
        );

        // Deliberately no `with('success', ...)` flash here: the frontend
        // already shows its own "Importing…"/"Import done" toast driven by
        // jiraImportProgress (see WorkspaceSettingsIntegrationsTab.tsx). A
        // flash on top would be redundant on the first click, and since
        // shared props omitted from a partial reload never get re-evaluated
        // client-side, the live-progress poller re-triggering Inertia's
        // global success handler would keep re-showing this same stale
        // message on every poll tick until it happened to age out.
        return redirect()->back();
    }

    private function findConnectedIntegration(Project $project): ProjectIntegration
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'jira');

        abort_if(! $projectIntegration || empty($projectIntegration->credentials), 404, 'Jira is not connected for this project.');

        return $projectIntegration;
    }
}
