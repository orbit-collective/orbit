<?php

namespace App\Http\Controllers;

use App\Services\NsfwDetectionService;
use App\Services\UserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Throwable;

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

        try {
            $isValid = $nsfwDetection->validate($avatar);
        } catch (Throwable $e) {
            Log::error('NSFW detection service failure during avatar upload: ' . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $request->user()?->id,
            ]);

            return back()->withErrors([
                'avatar' => 'Unable to verify image safety right now. Please try again later.',
            ])->with('error', 'Unable to verify image safety right now. Please try again later.');
        }

        if (! $isValid) {
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

    public function revokeSession(Request $request, string $session): RedirectResponse
    {
        $this->userService->revokeSession($request->user(), $session);

        return back()->with('success', 'Session has been signed out.');
    }

    public function revokeOtherSessions(Request $request): RedirectResponse
    {
        $this->userService->revokeOtherSessions($request->user());

        return back()->with('success', 'Signed out of all other sessions.');
    }
    public function updateSessionLifetime(Request $request, int $lifetime): RedirectResponse
    {
        Validator::make(
            ['lifetime' => $lifetime],
            ['lifetime' => 'required|integer|in:60,480,1440,10080']
        )->validate();

        $this->userService->updateSessionLifetime($request->user(), $lifetime);

        return back()->with('success', 'Session lifetime has been updated.');
    }
    public function deleteAccount(Request $request): RedirectResponse
    {
        $this->userService->removeAccount($request->user());

        return back()->with('success', 'Account has been deleted.');
    }
}
