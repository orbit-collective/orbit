<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectIntegrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectIntegrationController extends Controller
{
    public function __construct(
        protected ProjectIntegrationService $projectIntegrationService
    ) {}

    public function update(Request $request, Project $project, string $integration): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $this->projectIntegrationService->setEnabled($project, $integration, $validated['enabled']);

        $action = $validated['enabled'] ? 'enabled' : 'disabled';

        return redirect()->back()->with('success', "The \"$integration\" integration has been $action.");
    }

    public function updateSettings(Request $request, Project $project, string $integration): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'options' => ['sometimes', 'array'],
            'options.*' => ['boolean'],
        ]);

        $this->projectIntegrationService->updateSettings($project, $integration, $validated);

        return redirect()->back()->with('success', "Settings for the \"$integration\" integration have been updated.");
    }
}
