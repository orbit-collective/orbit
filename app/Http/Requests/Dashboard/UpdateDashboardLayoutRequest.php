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
            'widgets.*.span' => ['required', 'integer', Rule::in(DashboardWidgetType::SPANS)],
            'widgets.*.visible' => 'required|boolean',
            'widgets.*.config' => 'nullable|array',
        ];
    }

    /**
     * What depends on a widget's type: its variant, its width and its options.
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            foreach ((array) $this->input('widgets', []) as $index => $widget) {
                $type = DashboardWidgetType::tryFrom((string) ($widget['type'] ?? ''));

                if ($type === null) {
                    continue;
                }

                if (! in_array($widget['variant'] ?? null, $type->variants(), true)) {
                    $validator->errors()->add("widgets.$index.variant", 'This variant is not available for the widget.');
                }

                if (! in_array($widget['span'] ?? null, $type->spans(), true)) {
                    $validator->errors()->add("widgets.$index.span", 'This width is not available for the widget.');
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
