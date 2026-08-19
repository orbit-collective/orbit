<?php

namespace App\Http\Controllers;

use App\Models\SavedFilter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SavedFilterController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:20',
            'context' => 'required|string',
            'query_params' => 'required|array',
        ]);

        SavedFilter::create($validated);
        return redirect()->back()->with('success', 'Saved filters has been created successfully.');
    }

    public function destroy(SavedFilter $savedFilter): RedirectResponse
    {
        $savedFilter->delete();
        return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
    }
}
