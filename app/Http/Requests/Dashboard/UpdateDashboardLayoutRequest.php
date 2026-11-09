<?php

namespace App\Http\Requests\Dashboard;

use App\Enums\Dashboard\DashboardWidgetType;
use App\Services\DashboardLayoutService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDashboardLayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'widgets' => 'present|array|max:'.DashboardLayoutService::MAX_WIDGETS,
            'widgets.*.id' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{1,64}$/', 'distinct'],
            'widgets.*.type' => ['required', Rule::enum(DashboardWidgetType::class)],
            'widgets.*.variant' => 'required|string',
            'widgets.*.width' => ['required', 'integer', 'max:'.DashboardWidgetType::GRID_COLUMNS],
            'widgets.*.height' => ['required', 'integer', 'max:'.DashboardWidgetType::MAX_HEIGHT],
            'widgets.*.visible' => 'required|boolean',
            'widgets.*.config' => 'nullable|array',
        ];
    }

    /**
     * What depends on a widget's type: its variant, its minimum size and its options.
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            foreach ((array) $this->input('widgets', []) as $index => $widget) {
                // The rules already refuse these; they only must not break this hook.
                if (! is_array($widget) || ! is_string($widget['type'] ?? null)) {
                    continue;
                }

                $type = DashboardWidgetType::tryFrom($widget['type']);

                if ($type === null) {
                    continue;
                }

                if (! in_array($widget['variant'] ?? null, $type->variants(), true)) {
                    $validator->errors()->add("widgets.$index.variant", 'This variant is not available for the widget.');
                }

                if (is_int($widget['width'] ?? null) && $widget['width'] < $type->minWidth()) {
                    $validator->errors()->add("widgets.$index.width", 'The widget cannot be this narrow.');
                }

                if (is_int($widget['height'] ?? null) && $widget['height'] < $type->minHeight()) {
                    $validator->errors()->add("widgets.$index.height", 'The widget cannot be this short.');
                }

                foreach ((array) ($widget['config'] ?? []) as $key => $value) {
                    $option = $type->options()[$key] ?? null;

                    if ($option === null || ! in_array($value, $option['options'], true)) {
                        $validator->errors()->add("widgets.$index.config.$key", 'This option is not valid for the widget.');
                    }
                }
            }
        }];
    }

    /**
     * @return list<array>
     */
    public function widgets(): array
    {
        return array_values($this->validated('widgets'));
    }
}
