<?php

namespace App\Http\Requests\Notifications;

use App\Repositories\NotificationRepository;
use Illuminate\Foundation\Http\FormRequest;

class BulkNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => 'required|array|min:1|max:'.NotificationRepository::MAX_BULK_IDS,
            'ids.*' => 'integer|min:1',
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_values(array_unique(array_map('intval', $this->validated('ids'))));
    }
}
