<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * lucide-react 1.68 renamed its *Alert and *Warning icons. Rewrites the
     * names stored in priorities and issue types; the frontend `Icon` still
     * resolves the old names for everything else (dashboard widget options).
     */
    private const RENAMES = [
        'BadgeAlert' => 'BadgeExclamationPoint',
        'BatteryWarning' => 'BatteryExclamationPoint',
        'BookAlert' => 'BookExclamationPoint',
        'CircleAlert' => 'CircleExclamationPoint',
        'ClockAlert' => 'ClockExclamationPoint',
        'CloudAlert' => 'CloudExclamationPoint',
        'MailWarning' => 'MailExclamationPoint',
        'MessageCircleWarning' => 'MessageCircleExclamationPoint',
        'MessageSquareWarning' => 'MessageSquareExclamationPoint',
        'OctagonAlert' => 'OctagonExclamationPoint',
        'SearchAlert' => 'SearchExclamationPoint',
        'ShieldAlert' => 'ShieldExclamationPoint',
        'TriangleAlert' => 'TriangleExclamationPoint',
    ];

    public function up(): void
    {
        $this->rename(self::RENAMES);
    }

    public function down(): void
    {
        $this->rename(array_flip(self::RENAMES));
    }

    /** @param array<string, string> $map */
    private function rename(array $map): void
    {
        foreach (['priorities', 'issue_types'] as $table) {
            foreach ($map as $from => $to) {
                DB::table($table)->where('icon', $from)->update(['icon' => $to]);
            }
        }
    }
};
