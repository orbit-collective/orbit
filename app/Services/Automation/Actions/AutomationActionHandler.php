<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;

/**
 * One automation action type. Every handler wraps an existing Orbit
 * mutation service - see AutomationActionResolver for how a type resolves
 * to its handler, and App\Enums\AutomationActionType for the full list.
 */
interface AutomationActionHandler
{
    /**
     * @param  array<string, mixed>  $params
     */
    public function handle(Issue $issue, array $params): void;
}
