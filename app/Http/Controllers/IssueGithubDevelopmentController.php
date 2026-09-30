<?php

namespace App\Http\Controllers;

use App\Models\Issue;
use App\Services\Integrations\Github\GithubBranchService;
use App\Services\Integrations\Github\GithubPullRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Create-branch/create-pull-request actions from an Orbit issue's
 * Development panel - a thin controller, everything else (repository
 * ownership validation, the orbit-issue marker, error translation) lives in
 * the Github*Service classes, mirroring GithubIntegrationController.
 *
 * Both actions additionally require the acting user's own Orbit account to
 * be linked to a GitHub account (Settings > Security & Access) - this is
 * deliberately separate from the `createGithubDevelopment` permission check:
 * permission is "is your role allowed to," this is "did you prove who you
 * are on GitHub." Neither implies the other.
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
        $this->assertGithubAccountLinked($request, 'branch');

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
        $this->assertGithubAccountLinked($request, 'pullRequest');

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

    private function assertGithubAccountLinked(Request $request, string $errorKey): void
    {
        if ($request->user()->github_id === null) {
            throw ValidationException::withMessages([
                $errorKey => 'Link your GitHub account in Settings before creating a branch or pull request.',
            ]);
        }
    }
}
