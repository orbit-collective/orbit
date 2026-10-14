<?php

namespace App\Http\Requests\Notifications;

use App\Repositories\NotificationRepository;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ListNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'before' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:'.NotificationRepository::MAX_PER_PAGE,
            'unread' => 'nullable|boolean',
            'type' => 'nullable|in:success,info,warning,error',
        ];
    }

    /**
     * This endpoint is fetched with axios, which cannot follow the redirect a
     * normal form request answers a failure with, so it gets the 422 JSON.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors(),
        ], 422));
    }

    /**
     * @return array{unread: bool, type: string|null}
     */
    public function filters(): array
    {
        return [
            'unread' => $this->boolean('unread'),
            'type' => $this->validated('type'),
        ];
    }
}
