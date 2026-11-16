<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Integrations\Github\GithubBranchService;
use App\Services\Integrations\Github\GithubDevelopmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The JSON behind a project's Development view. Thin like the rest: the
 * permission check and the request validation live here, everything that
 * talks to GitHub lives in GithubDevelopmentService. Reads need
 * `projects.github.development.view`; closing/reopening a pull request and
 * linking issues need `.manage`, and (like creating a branch or pull
 * request from an issue) the acting user's own Orbit account must be linked
 * to a GitHub account - permission says "is your role allowed to", the
 * link says "did you prove who you are on GitHub".
 */
class GithubDevelopmentController extends Controller
{
    private const int MAX_PER_PAGE = 100;

    public function __construct(
        protected GithubDevelopmentService $developmentService,
        protected GithubBranchService $branchService,
    ) {}

    /** Drops what the view cached, so its next reads go to GitHub (the refresh button). */
    public function refresh(Project $project): Response
    {
        $this->authorize('viewGithubDevelopment', $project);

        $this->developmentService->forget($project);

        return response()->noContent();
    }

    public function pullRequests(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'state' => ['sometimes', Rule::in(['open', 'closed', 'all'])],
            'since' => 'sometimes|nullable|date_format:Y-m-d',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:'.self::MAX_PER_PAGE,
        ]);

        return response()->json($this->developmentService->pullRequests(
            $project,
            $data['repository_id'],
            $data['state'] ?? 'open',
            $data['page'] ?? 1,
            $data['per_page'] ?? 30,
            $data['since'] ?? null,
        ));
    }

    public function pullRequest(Request $request, Project $project, int $number): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate(['repository_id' => 'required|integer|min:1']);

        return response()->json($this->developmentService->pullRequest($project, $data['repository_id'], $number));
    }

    public function commits(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'branch' => 'sometimes|nullable|string|max:200',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:'.self::MAX_PER_PAGE,
        ]);

        return response()->json([
            'commits' => $this->developmentService->commits(
                $project,
                $data['repository_id'],
                $data['branch'] ?? null,
                $data['page'] ?? 1,
                $data['per_page'] ?? 30,
            ),
        ]);
    }

    public function branches(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:'.self::MAX_PER_PAGE,
        ]);

        return response()->json($this->developmentService->branches($project, $data['repository_id'], $data['page'] ?? 1, $data['per_page'] ?? 10));
    }

    public function checks(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'ref' => ['required', 'string', 'max:200', 'regex:/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/'],
        ]);

        return response()->json($this->developmentService->checks($project, $data['repository_id'], $data['ref']));
    }

    /** The CI of the pull requests a view is showing, in one call. */
    public function checksBatch(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'refs' => 'required|array|min:1|max:20',
            'refs.*' => ['required', 'string', 'max:200', 'regex:/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/'],
        ]);

        return response()->json(['checks' => $this->developmentService->checksBatch($project, $data['repository_id'], array_values(array_unique($data['refs'])))]);
    }

    public function insights(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewGithubDevelopment', $project);

        $data = $request->validate(['repository_id' => 'required|integer|min:1']);

        return response()->json($this->developmentService->insights($project, $data['repository_id']));
    }

    public function searchIssues(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manageGithubDevelopment', $project);

        $data = $request->validate(['q' => 'required|string|min:1|max:100']);

        return response()->json(['issues' => $this->developmentService->searchIssues($project, $data['q'])]);
    }

    public function createBranch(Request $request, Project $project): JsonResponse
    {
        $this->authorize('createGithubDevelopment', $project);
        $this->assertGithubAccountLinked($request);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'name' => 'required|string|max:200',
            'base_branch' => 'sometimes|nullable|string|max:200',
        ]);

        $branch = $this->branchService->createBranch($project, $data['repository_id'], $data['name'], $data['base_branch'] ?? null);

        $this->developmentService->forget($project);

        return response()->json(['name' => $branch->name, 'url' => $branch->url], 201);
    }

    public function setPullRequestState(Request $request, Project $project, int $number): JsonResponse
    {
        $this->authorize('manageGithubDevelopment', $project);
        $this->assertGithubAccountLinked($request);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'state' => ['required', Rule::in(['open', 'closed'])],
        ]);

        $this->developmentService->setPullRequestState($project, $data['repository_id'], $number, $data['state']);

        return response()->json(['state' => $data['state']]);
    }

    public function linkIssue(Request $request, Project $project, int $number): JsonResponse
    {
        $this->authorize('manageGithubDevelopment', $project);
        $this->assertGithubAccountLinked($request);

        $data = $request->validate([
            'repository_id' => 'required|integer|min:1',
            'issue_id' => 'required|integer|min:1',
        ]);

        $this->developmentService->linkIssue($project, $data['repository_id'], $number, $data['issue_id']);

        return response()->json(['linked' => true], 201);
    }

    public function unlinkIssue(Request $request, Project $project, int $number, int $issue): JsonResponse
    {
        $this->authorize('manageGithubDevelopment', $project);
        $this->assertGithubAccountLinked($request);

        $data = $request->validate(['repository_id' => 'required|integer|min:1']);

        $this->developmentService->unlinkIssue($project, $data['repository_id'], $number, $issue);

        return response()->json(['linked' => false]);
    }

    private function assertGithubAccountLinked(Request $request): void
    {
        if ($request->user()->github_id === null) {
            throw ValidationException::withMessages([
                'development' => 'Link your GitHub account in Settings before changing pull requests or creating branches.',
            ]);
        }
    }
}
