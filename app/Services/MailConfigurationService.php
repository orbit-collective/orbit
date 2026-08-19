<?php

namespace App\Services;

class MailConfigurationService
{
    /**
     * The mailer drivers that never actually deliver mail anywhere (they just log or
     * capture messages in memory), so features gated on "is email actually working"
     * must treat them as disabled rather than configured.
     */
    private const array NON_DELIVERING_MAILERS = ['log', 'array'];

    public function isEnabled(): bool
    {
        $mailer = config('mail.default');

        return $mailer && ! in_array($mailer, self::NON_DELIVERING_MAILERS, true);
    }
}
