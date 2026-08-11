<?php

namespace App\Services;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\User;
use App\Repositories\NotificationSettingRepository;

final readonly class NotificationSettingService
{
    public function __construct(private NotificationSettingRepository $notificationSettingRepository, private ActivityLogService $activityLogService) {}

    public function isEnabled(User $user, NotificationType $type, NotificationChannel $channel): bool
    {
        $setting = $this->notificationSettingRepository->find($user, $type, $channel);

        return $setting?->enabled ?? $channel->enabledByDefault();
    }

    public function update(User $user, NotificationType $type, NotificationChannel $channel, bool $enabled): void
    {
        $this->notificationSettingRepository->updateOrCreate($user, $type, $channel, $enabled);
    }

    public function updateSettings(User $user, array $settings): void
    {
        foreach ($settings as $type => $channels) {
            $notificationType = NotificationType::from($type);

            foreach ($channels as $channel => $enabled) {
                $this->update($user, $notificationType, NotificationChannel::from($channel), $enabled);
            }
        }

        $this->activityLogService->log(null, 'Updated notification settings', $user->id);
    }

    public function getAllSettings(User $user): array
    {
        $result = [];

        foreach (NotificationType::cases() as $type) {
            foreach (NotificationChannel::cases() as $channel) {
                $result[$type->value][$channel->value] = $channel->enabledByDefault();
            }
        }

        foreach ($this->notificationSettingRepository->getForUser($user) as $setting) {
            $result[$setting->type->value][$setting->channel->value] = $setting->enabled;
        }

        return $result;
    }
}
