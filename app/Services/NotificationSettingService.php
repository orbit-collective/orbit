<?php

namespace App\Services;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Repositories\NotificationSettingRepository;

final readonly class NotificationSettingService
{
    public function __construct(private NotificationSettingRepository $notificationSettingRepository, private ActivityLogService $activityLogService) {}

    public function isEnabled(int $userId, NotificationType $type, NotificationChannel $channel): bool
    {
        $setting = $this->notificationSettingRepository->find($userId, $type, $channel);

        return $setting?->enabled ?? $channel->enabledByDefault();
    }

    public function update(int $userId, NotificationType $type, NotificationChannel $channel, bool $enabled): void
    {
        $this->notificationSettingRepository->updateOrCreate($userId, $type, $channel, $enabled);
    }

    public function updateSettings(int $userId, array $settings): void
    {
        foreach ($settings as $type => $channels) {
            $notificationType = NotificationType::from($type);

            foreach ($channels as $channel => $enabled) {
                $this->update($userId, $notificationType, NotificationChannel::from($channel), $enabled);
            }
        }

        $this->activityLogService->log(null, 'Updated notification settings', $userId);
    }

    public function getAllSettings(int $userId): array
    {
        $result = [];

        foreach (NotificationType::cases() as $type) {
            foreach (NotificationChannel::cases() as $channel) {
                $result[$type->value][$channel->value] = $channel->enabledByDefault();
            }
        }

        foreach ($this->notificationSettingRepository->getForUser($userId) as $setting) {
            $result[$setting->type->value][$setting->channel->value] = $setting->enabled;
        }

        return $result;
    }
}
