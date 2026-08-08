<?php

namespace App\Http\Controllers;

use App\Services\NsfwDetectionService;
use App\Services\UserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function completeOnboarding(): RedirectResponse
    {
        $this->userService->completeOnboarding(auth()->user());

        return redirect()->back();
    }

    public function completeProjectOnboarding(): RedirectResponse
    {
        $this->userService->completeProjectOnboarding(auth()->user());

        return redirect()->back();
    }

    public function rename(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:30|min:3',
        ]);

        if ($validator->fails()) {
            return redirect()
                ->back()
                ->withErrors($validator)
                ->withInput()
                ->with(
                    'error',
                    'Profile name update failed. Please fix the form errors.',
                );
        }

        $validated = $validator->validated();

        $this->userService->rename($request->user(), $validated['name']);

        return redirect()
            ->back()
            ->with('success', 'Profile name has been updated successfully.');
    }

    public function uploadAvatar(Request $request, NsfwDetectionService $nsfwDetection): RedirectResponse
    {
        $request->validate([
            'avatar' => [
                'required',
                'image',
                'mimes:jpeg,png,gif',
                'max:5120',
            ],
        ]);

        $avatar = $request->file('avatar');

        if (! $nsfwDetection->validate($avatar)) {
            return back()->withErrors([
                'avatar' => 'This image cannot be used.',
            ])->with('error', 'This image cannot be used.');
        }

        $this->userService->updateProfile($request->user(), [], $avatar);

        return back();
    }

    public function resetAvatar(Request $request): RedirectResponse
    {
        $this->userService->resetAvatar($request->user());

        return back();
    }
    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $this->userService->updatePassword($request->user(), $request->input('current_password'), $request->input('new_password'));

        return back()->with('success', 'Password has been updated successfully.');
    }
}
