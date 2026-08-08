<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(protected UserRepository $userRepository) {}

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

        return $this->userRepository->update($user, $data);
    }

    public function resetAvatar(User $user): User {
        if ($user->avatar) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
        }

        return $this->userRepository->update($user, ['avatar' => null]);
    }

    public function completeOnboarding(User $user): User {
        return $this->userRepository->completeOnboarding($user);
    }

    public function completeProjectOnboarding(User $user): User {
        return $this->userRepository->completeProjectOnboarding($user);
    }
    public function rename(User $user, string $newName): User {
        return $this->userRepository->rename($user, $newName);
    }
    public function updatePassword(User $user, string $currentPassword, string $newPassword): User {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The provided password does not match your current password.',
            ]);
        }

        return $this->userRepository->updatePassword($user, $newPassword);
    }
}
