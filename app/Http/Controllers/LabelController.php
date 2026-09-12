<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Services\LabelService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LabelController extends Controller
{
    public function __construct(
        protected LabelService $labelService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('createLabels', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        // A custom label can otherwise be created before the project's
        // starter taxonomy is seeded - if its name collides with a system
        // label (e.g. "bug"), ensureSystemLabels()'s later firstOrCreate()
        // would just find this custom row and leave it as-is, permanently
        // losing the real system label under that name.
        $this->labelService->ensureSystemLabels($project);

        $this->labelService->createLabel($project, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" label has been created.");
    }

    public function update(Request $request, Project $project, Label $label): RedirectResponse
    {
        $this->ensureLabelBelongsToProject($project, $label);
        $this->authorize('updateLabels', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $this->labelService->updateLabel($project, $label, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" label has been updated.");
    }

    public function destroy(Project $project, Label $label): RedirectResponse
    {
        $this->ensureLabelBelongsToProject($project, $label);
        $this->authorize('deleteLabels', $project);

        $name = $label->name;

        $this->labelService->deleteLabel($project, $label);

        return redirect()->back()->with('success', "The \"$name\" label has been deleted.");
    }

    private function ensureLabelBelongsToProject(Project $project, Label $label): void
    {
        if ($label->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }
}
