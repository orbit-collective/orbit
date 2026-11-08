<?php

namespace App\Repositories;

use App\Models\DashboardLayout;
use App\Models\DashboardSavedLayout;
use Illuminate\Database\Eloquent\Collection;

class DashboardSavedLayoutRepository
{
    /**
     * @return Collection<int, DashboardSavedLayout> the newest first
     */
    public function listForUser(int $userId): Collection
    {
        return DashboardSavedLayout::query()
            ->where('user_id', $userId)
            ->latest('updated_at')
            ->latest('id')
            ->get();
    }

    public function countForUser(int $userId): int
    {
        return DashboardSavedLayout::query()->where('user_id', $userId)->count();
    }

    public function existsForUser(int $userId, string $name): bool
    {
        return DashboardSavedLayout::query()
            ->where('user_id', $userId)
            ->where('name', $name)
            ->exists();
    }

    public function updateOrCreateForUser(int $userId, string $name, array $widgets): DashboardSavedLayout
    {
        return DashboardSavedLayout::query()->updateOrCreate(
            ['user_id' => $userId, 'name' => $name],
            ['widgets' => $widgets, 'version' => DashboardLayout::VERSION],
        );
    }

    /** Only the user's own layout is found, so someone else's is a 404. */
    public function findForUserOrFail(int $userId, int $id): DashboardSavedLayout
    {
        return DashboardSavedLayout::query()
            ->where('user_id', $userId)
            ->findOrFail($id);
    }

    public function delete(DashboardSavedLayout $layout): void
    {
        $layout->delete();
    }
}
