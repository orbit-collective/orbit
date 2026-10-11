<?php
namespace App\Repositories;

use App\Models\User;
use App\Support\Cache\CacheVersion;
use App\Support\LikePattern;
use App\Support\Sessions\SessionRegistry;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

class UserRepository {
    public function getAssignableUsersForProject(int $projectId): Collection
    {
        return User::query()
            ->select('users.id', 'users.name', 'users.avatar')
            ->whereHas('projects', fn ($query) => $query->where('projects.id', $projectId))
            ->get();
    }

    public function getAssignableUsersForUserProjects(int $userId): Collection
    {
        return User::query()
            ->select('users.id', 'users.name', 'users.avatar')
            ->whereHas('projects', function ($query) use ($userId) {
                $query->whereIn('projects.id', function ($subQuery) use ($userId) {
                    $subQuery->select('project_id')->from('project_user')->where('user_id', $userId);
                });
            })
            ->distinct()
            ->get();
    }

    /**
     * Members of the projects the user belongs to whose name contains the
     * query, one row per (person, shared project) so a result can link to a
     * project's issue list filtered to that assignee. Name prefix ranks above
     * a substring; the user's own projects only, so nobody outside them leaks.
     *
     * @return SupportCollection<int, object{user_id: int, name: string, avatar: ?string, project_id: int, project_name: string}>
     */
    public function searchMembersForUser(int $userId, string $q, int $limit = 8): SupportCollection
    {
        $escape = LikePattern::ESCAPE;

        return DB::table('project_user as theirs')
            ->join('project_user as mine', 'mine.project_id', '=', 'theirs.project_id')
            ->join('users', 'users.id', '=', 'theirs.user_id')
            ->join('projects', 'projects.id', '=', 'theirs.project_id')
            ->where('mine.user_id', $userId)
            ->whereRaw("LOWER(users.name) LIKE ? ESCAPE '{$escape}'", [LikePattern::contains($q)])
            ->select([
                'users.id as user_id',
                'users.name',
                'users.avatar',
                'projects.id as project_id',
                'projects.name as project_name',
            ])
            ->orderByRaw("CASE WHEN LOWER(users.name) LIKE ? ESCAPE '{$escape}' THEN 0 ELSE 1 END", [LikePattern::startsWith($q)])
            ->orderBy('users.name')
            ->orderBy('projects.name')
            ->limit($limit)
            ->get();
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
        if ($this->sessionRegistry()->enabled()) {
            return $this->sessionRegistry()->forUser($user->id);
        }

        return DB::table('sessions')->where('user_id', $user->id)->orderByDesc('last_activity')->get();
    }

    public function deleteSession(User $user, string $sessionId): bool
    {
        if ($this->sessionRegistry()->enabled()) {
            return $this->sessionRegistry()->revoke($user->id, $sessionId);
        }

        return DB::table('sessions')
            ->where('id', $sessionId)
            ->where('user_id', $user->id)
            ->delete() > 0;
    }

    public function deleteOtherSessions(User $user, string $currentSessionId): int
    {
        if ($this->sessionRegistry()->enabled()) {
            return $this->sessionRegistry()->revokeOthers($user->id, $currentSessionId);
        }

        return DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $currentSessionId)
            ->delete();
    }

    private function sessionRegistry(): SessionRegistry
    {
        return app(SessionRegistry::class);
    }

    public function updateSessionLifetime(User $user, int $lifetime): User {
        session()->put('session_lifetime', $lifetime);
        $user->update(['session_lifetime' => $lifetime]);
        return $user;
    }

    public function delete(User $user): bool {
        // Deleting the account cascades its project memberships.
        CacheVersion::bump(CacheVersion::MEMBERSHIP);

        return $user->delete();
    }
    public function findById(int $id): ?User {
        return User::query()->find($id);
    }
    public function findByEmail(string $email): ?User {
        return User::query()->where('email', $email)->first();
    }
    public function findByGithubId(string $githubId): ?User {
        return User::query()->where('github_id', $githubId)->first();
    }
    public function linkGithubAccount(User $user, string $githubId, string $githubUsername): User {
        $user->update(['github_id' => $githubId, 'github_username' => $githubUsername]);
        return $user;
    }
    public function unlinkGithubAccount(User $user): User {
        $user->update(['github_id' => null, 'github_username' => null]);
        return $user;
    }
}
