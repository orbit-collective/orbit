<?php

namespace App\Enums\Notifications;

/**
 * How often a user's automatic notification clean-up runs.
 */
enum RetentionFrequency: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';

    /** Minimum number of days between two runs for the same user. */
    public function days(): int
    {
        return match ($this) {
            self::Daily => 1,
            self::Weekly => 7,
            self::Monthly => 30,
        };
    }
}
