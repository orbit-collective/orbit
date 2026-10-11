<?php

namespace App\Http\Controllers;

use App\Services\CommandPaletteSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommandPaletteController extends Controller
{
    public function __construct(
        protected CommandPaletteSearchService $searchService,
    ) {}

    /**
     * Internal JSON endpoint behind the command palette's issue/project
     * search - the one deliberate exception to "no JSON API", because the
     * palette is a global overlay that no single Inertia page owns.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
        ]);

        return response()->json(
            $this->searchService->search($request->user()->id, $validated['q'])
        );
    }
}
