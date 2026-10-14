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
