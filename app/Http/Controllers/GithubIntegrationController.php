<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Integrations\Github\GithubIntegrationService;
use Illuminate\Http\RedirectResponse;

class GithubIntegrationController extends Controller
{
    public function __construct(
        protected GithubIntegrationService $githubIntegrationService,
    ) {}

    public function connect(Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $this->githubIntegrationService->connect($project);

        return redirect()->back();
    }

    public function disconnect(Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $this->githubIntegrationService->disconnect($project);

        return redirect()->back()->with('success', 'Disconnected GitHub.');
    }

    public function retry(Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $this->githubIntegrationService->retrySync($project);

        return redirect()->back();
    }
}
