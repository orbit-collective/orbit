<?php

namespace App\Http\Controllers;

use App\Http\Requests\Dashboard\StoreDashboardSavedLayoutRequest;
use App\Services\DashboardSavedLayoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DashboardSavedLayoutController extends Controller
{
    public function __construct(protected DashboardSavedLayoutService $savedLayouts) {}

    public function store(StoreDashboardSavedLayoutRequest $request): RedirectResponse
    {
        $this->savedLayouts->save($request->user()->id, $request->name(), $request->widgets());

        return redirect()->back();
    }

    public function destroy(Request $request, int $savedLayout): RedirectResponse
    {
        $this->savedLayouts->delete($request->user()->id, $savedLayout);

        return redirect()->back();
    }
}
