<?php

namespace App\Repositories;

use App\Enums\Notifications\RetentionFrequency;
use App\Models\NotificationRetentionSetting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class NotificationRetentionRepository
{
    public function findForUser(int $userId): ?NotificationRetentionSetting
    {
        return NotificationRetentionSetting::query()->where('user_id', $userId)->first();
    }

    /**
     * The user's schedule with a row lock held until the surrounding
     * transaction ends, so a concurrent settings save waits for it. Call it
     * inside DB::transaction().
     */
    public function findForUserForUpdate(int $userId): ?NotificationRetentionSetting
    {
        return NotificationRetentionSetting::query()->where('user_id', $userId)->lockForUpdate()->first();
    }

    public function updateOrCreateForUser(int $userId, array $data): NotificationRetentionSetting
    {
        return NotificationRetentionSetting::query()->updateOrCreate(['user_id' => $userId], $data);
    }

    /**
     * Stamp a finished run. An update, not an upsert: a schedule that was
     * deleted meanwhile (its user deleted the account) must stay deleted.
     */
    public function markRun(int $userId, Carbon $at): void
    {
        NotificationRetentionSetting::query()->where('user_id', $userId)->update(['last_run_at' => $at]);
    }

    /**
     * Enabled schedules whose last run is at least one full period old (or
     * that never ran), judged per frequency.
     *
     * @return Collection<int, NotificationRetentionSetting>
     */
    public function getDue(Carbon $now): Collection
    {
        $due = new Collection;

        foreach (RetentionFrequency::cases() as $frequency) {
            $threshold = $now->copy()->subDays($frequency->days());

            $due = $due->concat(
                NotificationRetentionSetting::query()
                    ->where('enabled', true)
                    ->where('frequency', $frequency)
                    ->where(fn ($query) => $query->whereNull('last_run_at')->orWhere('last_run_at', '<=', $threshold))
                    ->get(),
            );
        }

        return $due;
    }
}
