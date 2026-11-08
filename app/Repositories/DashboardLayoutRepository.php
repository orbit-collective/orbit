<?php

namespace App\Repositories;

use App\Models\DashboardLayout;

class DashboardLayoutRepository
{
    public function findForUser(int $userId): ?DashboardLayout
    {
        return DashboardLayout::query()->where('user_id', $userId)->first();
    }

    public function updateOrCreateForUser(int $userId, array $widgets): DashboardLayout
    {
        return DashboardLayout::query()->updateOrCreate(
            ['user_id' => $userId],
            ['widgets' => $widgets, 'version' => DashboardLayout::VERSION],
        );
    }

    public function deleteForUser(int $userId): void
    {
        DashboardLayout::query()->where('user_id', $userId)->delete();
    }
}
