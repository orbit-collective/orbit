<?php

namespace App\Http\Controllers;

use App\Models\Issue;
use App\Services\Integrations\Github\GithubBranchService;
use App\Services\Integrations\Github\GithubPullRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Create-branch/create-pull-request actions from an Orbit issue's
 * Development panel - a thin controller, everything else (repository
 * ownership validation, the orbit-issue marker, error translation) lives in
 * the Github*Service classes, mirroring GithubIntegrationController.
 */
class IssueGithubDevelopmentController extends Controller
{
    public function __construct(
        protected GithubBranchService $branchService,
        protected GithubPullRequestService $pullRequestService,
    ) {}

    public function createBranch(Request $request, Issue $issue): RedirectResponse
    {
        $this->authorize('createGithubDevelopment', $issue);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'name' => 'required|string|max:200',
            'base_branch' => 'sometimes|nullable|string',
        ]);

        $branch = $this->branchService->create(
            $issue->project,
            $issue,
            $data['repository_id'],
            $data['name'],
            $data['base_branch'] ?? null,
        );

        return redirect()->back()->with('success', "Created branch \"$branch->name\".");
    }

    public function createPullRequest(Request $request, Issue $issue): RedirectResponse
    {
        $this->authorize('createGithubDevelopment', $issue);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'title' => 'required|string|max:256',
            'head' => 'required|string',
            'base' => 'required|string',
            'body' => 'sometimes|nullable|string',
        ]);

        $pullRequest = $this->pullRequestService->create(
            $issue->project,
            $issue,
            $data['repository_id'],
            $data['title'],
            $data['head'],
            $data['base'],
            $data['body'] ?? '',
        );

        return redirect()->back()->with('success', "Created pull request #$pullRequest->number.");
    }
}
