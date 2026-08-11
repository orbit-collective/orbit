<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        protected UserRepository $userRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function getAssignableUsers(): Collection {
        return $this->userRepository->getAssignableUsers();
    }

    public function updateProfile(User $user, array $data, ?UploadedFile $avatarFile = null): User {
        if ($avatarFile) {
            if ($user->avatar) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
            }

            $path = $avatarFile->store('avatars', 'public');
            $data['avatar'] = Storage::url($path);
        }

        $updatedUser = $this->userRepository->update($user, $data);

        $this->activityLogService->log(
            null,
            $avatarFile ? 'Uploaded a new profile avatar' : 'Updated profile details',
            $user->id
        );

        return $updatedUser;
    }

    public function resetAvatar(User $user): User {
        if ($user->avatar) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
        }

        $updatedUser = $this->userRepository->update($user, ['avatar' => null]);

        $this->activityLogService->log(null, 'Reset profile avatar to default', $user->id);

        return $updatedUser;
    }

    public function completeOnboarding(User $user): User {
        return $this->userRepository->completeOnboarding($user);
    }

    public function completeProjectOnboarding(User $user): User {
        return $this->userRepository->completeProjectOnboarding($user);
    }
    public function rename(User $user, string $newName): User {
        $updatedUser = $this->userRepository->rename($user, $newName);

        $this->activityLogService->log(null, "Changed display name to \"$newName\"", $user->id);

        return $updatedUser;
    }
    public function updatePassword(User $user, string $currentPassword, string $newPassword): User {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The provided password does not match your current password.',
            ]);
        }

        $updatedUser = $this->userRepository->updatePassword($user, $newPassword);

        $this->activityLogService->log(null, 'Changed account password', $user->id);

        return $updatedUser;
    }
    public function getUserSessions(User $user): SupportCollection {
        $sessions = $this->userRepository->getUserSessions($user);

        return $sessions->map(fn ($session) => [
            'id' => $session->id,
            'ipAddress' => $session->ip_address,
            'userAgent' => $session->user_agent,
            'lastActiveAt' => Carbon::createFromTimestamp(
                $session->last_activity
            )->toIso8601String(),
            'isCurrent' => $session->id === request()->session()->getId(),
        ]);
    }

    public function revokeSession(User $user, string $sessionId): void {
        if ($sessionId === request()->session()->getId()) {
            throw ValidationException::withMessages([
                'session' => 'You cannot revoke your current session.',
            ]);
        }

        $revoked = $this->userRepository->deleteSession($user, $sessionId);

        if (! $revoked) {
            throw ValidationException::withMessages([
                'session' => 'Session not found.',
            ]);
        }

        $this->activityLogService->log(null, 'Signed out of another active session', $user->id);
    }

    public function revokeOtherSessions(User $user): void {
        $this->userRepository->deleteOtherSessions($user, request()->session()->getId());

        $this->activityLogService->log(null, 'Signed out of all other active sessions', $user->id);
    }

    public function updateSessionLifetime(User $user, int $lifetime): User {
        $updatedUser = $this->userRepository->updateSessionLifetime($user, $lifetime);

        $this->activityLogService->log(null, 'Updated session lifetime', $user->id);

        return $updatedUser;
    }
    public function removeAccount(User $user): void {
        $this->activityLogService->log(null, 'Deleted account', $user->id);

        $this->userRepository->delete($user);
    }
    public function getUserById(int $userId): ?User {
        return $this->userRepository->findById($userId);
    }
}
