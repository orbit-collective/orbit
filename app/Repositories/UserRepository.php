<?php
namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

class UserRepository {
    public function getAssignableUsers(): Collection
    {
        return User::query()->select('id', 'name', 'avatar')->get();
    }

    public function update(User $user, array $data): User {
        $user->update($data);
        return $user;
    }

    public function create(array $data): User {
        return User::create($data);
    }

    public function hasAnyUsers(): bool {
        return User::query()->exists();
    }

    public function completeOnboarding(User $user): User {
        $user->update(['has_completed_onboarding' => true]);
        return $user;
    }

    public function completeProjectOnboarding(User $user): User {
        $user->update(['has_completed_project_onboarding' => true]);
        return $user;
    }

    public function rename(User $user, string $newName): User {
        $user->update(['name' => $newName]);
        return $user;
    }
    public function updatePassword(User $user, string $newPassword): User {
        $user->update(['password' => $newPassword]);
        return $user;
    }
    public function getUserSessions(User $user): SupportCollection
    {
        return DB::table('sessions')->where('user_id', $user->id)->orderByDesc('last_activity')->get();
    }

    public function deleteSession(User $user, string $sessionId): bool
    {
        return DB::table('sessions')
            ->where('id', $sessionId)
            ->where('user_id', $user->id)
            ->delete() > 0;
    }

    public function deleteOtherSessions(User $user, string $currentSessionId): int
    {
        return DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $currentSessionId)
            ->delete();
    }

    public function updateSessionLifetime(User $user, int $lifetime): User {
        session()->put('session_lifetime', $lifetime);
        $user->update(['session_lifetime' => $lifetime]);
        return $user;
    }

    public function delete(User $user): bool {
        return $user->delete();
    }
    public function findById(int $id): ?User {
        return User::query()->find($id);
    }
}
