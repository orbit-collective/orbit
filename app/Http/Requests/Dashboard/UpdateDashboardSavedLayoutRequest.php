<?php

namespace App\Http\Requests\Dashboard;

use App\Services\DashboardLayoutService;
use Illuminate\Validation\Rule;

/**
 * Rename a saved layout, replace its widgets, or both. The widgets are checked
 * as when the dashboard layout itself is saved.
 */
class UpdateDashboardSavedLayoutRequest extends UpdateDashboardLayoutRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            // An empty `widgets` list is a layout to replace with, so only a
            // missing `widgets` key makes the name required.
            'name' => [Rule::requiredIf(fn () => ! $this->has('widgets')), 'string', 'max:40'],
            'widgets' => 'sometimes|array|max:'.DashboardLayoutService::MAX_WIDGETS,
        ]);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    public function name(): ?string
    {
        return $this->validated('name');
    }

    /** @return list<array>|null */
    public function widgetsOrNull(): ?array
    {
        $widgets = $this->validated('widgets');

        return $widgets === null ? null : array_values($widgets);
    }
}
