<?php

namespace App\Services;

use App\Enums\Notifications\RetentionFrequency;
use App\Models\NotificationRetentionSetting;
use App\Repositories\NotificationRepository;
use App\Repositories\NotificationRetentionRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Automatic and manual clean-up of a user's old notifications and activity
 * history. The schedule lives in notification_retention_settings; the
 * `notifications:prune` command (see routes/console.php) calls runDue().
 */
class NotificationRetentionService
{
    /** Longest age a clean-up may be configured with (about ten years). */
    public const int MAX_DAYS = 3650;

    public function __construct(
        protected NotificationRetentionRepository $retentionRepository,
        protected NotificationRepository $notificationRepository,
        protected NotificationService $notificationService,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * The user's schedule, falling back to "off" for someone who never
     * configured one.
     *
     * @return array{enabled: bool, frequency: string, notifications_older_than_days: int|null, notifications_only_read: bool, activity_older_than_days: int|null, last_run_at: string|null}
     */
    public function getSettings(int $userId): array
    {
        $setting = $this->retentionRepository->findForUser($userId);

        return [
            'enabled' => $setting?->enabled ?? false,
            'frequency' => ($setting?->frequency ?? RetentionFrequency::Weekly)->value,
            'notifications_older_than_days' => $setting?->notifications_older_than_days,
            'notifications_only_read' => $setting?->notifications_only_read ?? true,
            'activity_older_than_days' => $setting?->activity_older_than_days,
            'last_run_at' => $setting?->last_run_at?->toIso8601String(),
        ];
    }

    public function updateSettings(int $userId, array $data): NotificationRetentionSetting
    {
        return $this->retentionRepository->updateOrCreateForUser($userId, $data);
    }

    public function purgeNotifications(int $userId, int $days, bool $onlyRead): int
    {
        $deleted = $this->notificationRepository->deleteOlderThanForUser($userId, now()->subDays($days), $onlyRead);

        if ($deleted > 0) {
            $this->notificationService->forget($userId);
        }

        return $deleted;
    }

    public function purgeActivity(int $userId, int $days): int
    {
        return $this->activityLogService->deleteOlderThanForUser($userId, $days);
    }

    /**
     * Apply every schedule that is due and stamp it, so it waits a full
     * period before the next run. Returns how many schedules ran.
     */
    public function runDue(?Carbon $now = null): int
    {
        $now ??= now();
        $ran = 0;

        foreach ($this->retentionRepository->getDue($now) as $due) {
            // One user's failure, bookkeeping included, must not stop everyone
            // else's clean-up; their schedule stays due and is retried next tick.
            try {
                $ran += (int) DB::transaction(fn () => $this->runOne($due->user_id, $now));
            } catch (Throwable $exception) {
                Log::warning('Notification clean-up failed', [
                    'userId' => $due->user_id,
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        return $ran;
    }

    /**
     * Run one user's schedule inside the caller's transaction. getDue() was
     * read before earlier users were processed, so the row is locked and read
     * again: the user may have switched it off, turned on "keep unread" or
     * deleted their account since. The lock makes a settings save wait until
     * the deletion and the run stamp have committed, so nothing is deleted
     * with values older than the ones just saved. A failure rolls the
     * deletion back together with the stamp.
     */
    private function runOne(int $userId, Carbon $now): bool
    {
        $setting = $this->retentionRepository->findForUserForUpdate($userId);

        if (! $setting?->enabled || ! $this->isDue($setting, $now)) {
            return false;
        }

        $this->apply($setting);
        $this->retentionRepository->markRun($userId, $now);

        return true;
    }

    private function isDue(NotificationRetentionSetting $setting, Carbon $now): bool
    {
        return $setting->last_run_at === null
            || $setting->last_run_at->lte($now->copy()->subDays($setting->frequency->days()));
    }

    private function apply(NotificationRetentionSetting $setting): void
    {
        if ($setting->notifications_older_than_days) {
            $this->purgeNotifications($setting->user_id, $setting->notifications_older_than_days, $setting->notifications_only_read);
        }

        if ($setting->activity_older_than_days) {
            $this->purgeActivity($setting->user_id, $setting->activity_older_than_days);
        }
    }
}
