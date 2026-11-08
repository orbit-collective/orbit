<?php

namespace App\Http\Requests\Dashboard;

/**
 * A layout to keep under a name: the widgets are checked exactly as when the
 * dashboard layout itself is saved.
 */
class StoreDashboardSavedLayoutRequest extends UpdateDashboardLayoutRequest
{
    public function rules(): array
    {
        return ['name' => 'required|string|max:40'] + parent::rules();
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    public function name(): string
    {
        return $this->validated('name');
    }
}
