<?php

namespace App\Http\Controllers;

use App\Http\Requests\Dashboard\UpdateDashboardLayoutRequest;
use App\Services\DashboardLayoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DashboardLayoutController extends Controller
{
    public function __construct(protected DashboardLayoutService $layouts) {}

    public function update(UpdateDashboardLayoutRequest $request): RedirectResponse
    {
        $this->layouts->save($request->user()->id, $request->widgets());

        return redirect()->back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $this->layouts->reset($request->user()->id);

        return redirect()->back();
    }
}
