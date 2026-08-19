<?php

namespace App\Http\Requests\Notifications;

use App\Enums\Notifications\NotificationType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationSettingsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'settings' => 'required|array',
            'settings.*' => 'required|array',
            'settings.*.in_app' => 'required|boolean',
            'settings.*.email' => 'required|boolean',
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $allowedTypes = array_map(fn (NotificationType $type) => $type->value, NotificationType::cases());

            foreach (array_keys($this->input('settings', [])) as $type) {
                if (! in_array($type, $allowedTypes, true)) {
                    $validator->errors()->add('settings', "Invalid notification type: $type");
                }
            }
        });
    }
}
