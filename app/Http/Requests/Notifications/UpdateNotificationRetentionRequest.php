<?php

namespace App\Http\Requests\Notifications;

use App\Enums\Notifications\RetentionFrequency;
use App\Services\NotificationRetentionService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationRetentionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $days = 'nullable|integer|min:1|max:'.NotificationRetentionService::MAX_DAYS;

        return [
            'enabled' => 'required|boolean',
            'frequency' => ['required', Rule::enum(RetentionFrequency::class)],
            'notifications_older_than_days' => $days,
            'notifications_only_read' => 'required|boolean',
            'activity_older_than_days' => $days,
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->boolean('enabled') && ! $this->filled('notifications_older_than_days') && ! $this->filled('activity_older_than_days')) {
                $validator->errors()->add('enabled', 'Choose what to clean up before turning the schedule on.');
            }
        });
    }
}
