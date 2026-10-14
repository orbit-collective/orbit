<?php

namespace App\Http\Requests\Notifications;

use App\Services\NotificationRetentionService;
use Illuminate\Foundation\Http\FormRequest;

class PurgeNotificationDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target' => 'required|in:notifications,activity',
            'days' => 'required|integer|min:1|max:'.NotificationRetentionService::MAX_DAYS,
            'only_read' => 'sometimes|boolean',
        ];
    }
}
