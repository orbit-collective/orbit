<?php

namespace App\Http\Controllers;

use App\Models\Priority;
use App\Models\Project;
use App\Services\PriorityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PriorityController extends Controller
{
    public function __construct(
        protected PriorityService $priorityService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('createPriorities', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'icon' => ['required', 'string', 'max:50'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $this->priorityService->createPriority($project, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" priority has been created.");
    }

    public function update(Request $request, Project $project, Priority $priority): RedirectResponse
    {
        $this->ensurePriorityBelongsToProject($project, $priority);
        $this->authorize('updatePriorities', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'icon' => ['required', 'string', 'max:50'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $this->priorityService->updatePriority($project, $priority, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" priority has been updated.");
    }

    public function destroy(Request $request, Project $project, Priority $priority): RedirectResponse
    {
        $this->ensurePriorityBelongsToProject($project, $priority);
        $this->authorize('deletePriorities', $project);

        $validated = $request->validate([
            'replacement_id' => ['nullable', 'integer', Rule::exists('priorities', 'id')->where('project_id', $project->id)],
        ]);

        $replacement = isset($validated['replacement_id'])
            ? $this->priorityService->findInProject($project, (int) $validated['replacement_id'])
            : null;

        $name = $priority->name;

        $this->priorityService->deletePriority($project, $priority, $replacement);

        return redirect()->back()->with('success', "The \"$name\" priority has been deleted.");
    }

    public function reorder(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updatePriorities', $project);

        $validated = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer'],
        ]);

        $this->priorityService->reorder($project, $validated['order']);

        return redirect()->back()->with('success', 'The priorities have been reordered.');
    }

    private function ensurePriorityBelongsToProject(Project $project, Priority $priority): void
    {
        if ($priority->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }
}
