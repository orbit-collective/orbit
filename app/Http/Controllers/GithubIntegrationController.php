<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Integrations\Github\GithubIntegrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

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

    public function syncRepositories(Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $this->githubIntegrationService->syncRepositories($project);

        return redirect()->back();
    }

    public function addRepository(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $validated = $request->validate([
            'repository_id' => ['required', 'integer', 'min:1'],
        ]);

        $this->githubIntegrationService->addRepository($project, $validated['repository_id']);

        return redirect()->back()->with('success', 'Repository connected.');
    }

    public function removeRepository(Project $project, int $repositoryId): RedirectResponse
    {
        $this->authorize('updateIntegrations', $project);

        $this->githubIntegrationService->removeRepository($project, $repositoryId);

        return redirect()->back()->with('success', 'Repository disconnected.');
    }
}
