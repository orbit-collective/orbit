<?php

namespace App\Rules;

use App\Models\Project;
use App\Services\PriorityService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A priority is sent by name and has to be one of the project's own
 * (case-insensitive), so a name from another project's scale is refused.
 */
class ProjectPriorityName implements ValidationRule
{
    public function __construct(private readonly Project $project) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value) || app(PriorityService::class)->findByName($this->project, $value) === null) {
            $fail('The selected priority is invalid.');
        }
    }
}
