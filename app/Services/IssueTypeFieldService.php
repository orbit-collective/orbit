<?php

namespace App\Services;

use App\Enums\IssueFieldType;
use App\Models\IssueType;
use App\Models\IssueTypeField;
use App\Repositories\IssueTypeFieldRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class IssueTypeFieldService
{
    public function __construct(
        protected IssueTypeFieldRepository $issueTypeFieldRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /** @return Collection<int, IssueTypeField> */
    public function getFields(IssueType $issueType): Collection
    {
        return $this->issueTypeFieldRepository->getForType($issueType);
    }

    public function createField(IssueType $issueType, array $data): IssueTypeField
    {
        $this->assertLabelAvailable($issueType, $data['label']);

        $type = IssueFieldType::from($data['type']);

        $field = $this->issueTypeFieldRepository->create($issueType, [
            'label' => $data['label'],
            'type' => $type,
            'options' => $this->normalizeOptions($type, $data['options'] ?? []),
            'placeholder' => $data['placeholder'] ?? null,
            'is_required' => $data['is_required'] ?? false,
            'sort_order' => $this->issueTypeFieldRepository->nextSortOrder($issueType),
        ]);

        $this->activityLogService->log($issueType->project_id, "Added the \"$field->label\" field to the \"$issueType->name\" issue type");

        return $field;
    }

    public function updateField(IssueType $issueType, IssueTypeField $field, array $data): IssueTypeField
    {
        if (array_key_exists('label', $data) && $data['label'] !== $field->label) {
            $this->assertLabelAvailable($issueType, $data['label']);
        }

        $type = array_key_exists('type', $data) ? IssueFieldType::from($data['type']) : $field->type;

        $field = $this->issueTypeFieldRepository->update($field, [
            'label' => $data['label'] ?? $field->label,
            'type' => $type,
            'options' => $this->normalizeOptions($type, $data['options'] ?? $field->options ?? []),
            'placeholder' => $data['placeholder'] ?? null,
            'is_required' => $data['is_required'] ?? false,
        ]);

        $this->activityLogService->log($issueType->project_id, "Updated the \"$field->label\" field on the \"$issueType->name\" issue type");

        return $field;
    }

    public function deleteField(IssueType $issueType, IssueTypeField $field): void
    {
        $label = $field->label;

        $this->issueTypeFieldRepository->delete($field);

        $this->activityLogService->log($issueType->project_id, "Removed the \"$label\" field from the \"$issueType->name\" issue type");
    }

    /**
     * Keeps only values addressed to a field that still exists on this type,
     * coerced to that field's shape. Values for a deleted or foreign field are
     * dropped rather than rejected - an issue edited from a stale page must
     * not fail just because a field was removed meanwhile.
     */
    public function sanitizeValues(IssueType $issueType, array $values): array
    {
        $fields = $this->getFields($issueType)->keyBy('id');
        $sanitized = [];

        foreach ($values as $fieldId => $value) {
            $field = $fields->get((int) $fieldId);

            if (! $field || $value === null || $value === '') {
                continue;
            }

            $coerced = $this->coerce($field, $value);

            // A value the field's own shape rejects (an option that is not on
            // the list, a non-numeric number) is dropped rather than stored.
            if ($coerced === null) {
                continue;
            }

            $sanitized[(string) $field->id] = $coerced;
        }

        return $sanitized;
    }

    /**
     * Required custom fields are enforced the same way IssueTypeService does
     * it for the built-in ones: only against the values the request actually
     * carries, so a partial update of an unrelated field still goes through.
     */
    public function assertRequiredFieldsSatisfied(IssueType $issueType, array $values): void
    {
        foreach ($this->getFields($issueType)->where('is_required', true) as $field) {
            $value = $values[(string) $field->id] ?? null;

            if ($value === null || $value === '' || $value === []) {
                throw ValidationException::withMessages([
                    'custom_fields' => "The \"$field->label\" field is required for a \"$issueType->name\" issue.",
                ]);
            }
        }
    }

    private function coerce(IssueTypeField $field, mixed $value): mixed
    {
        return match ($field->type) {
            IssueFieldType::NUMBER => is_numeric($value) ? $value + 0 : null,
            IssueFieldType::CHECKBOX => (bool) $value,
            IssueFieldType::SELECT => in_array($value, $field->options ?? [], true) ? $value : null,
            default => (string) $value,
        };
    }

    private function normalizeOptions(IssueFieldType $type, array $options): array
    {
        if (! $type->usesOptions()) {
            return [];
        }

        return collect($options)
            ->map(fn ($option) => trim((string) $option))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function assertLabelAvailable(IssueType $issueType, string $label): void
    {
        if ($issueType->fields()->where('label', $label)->exists()) {
            throw ValidationException::withMessages([
                'label' => 'A field with this label already exists on this issue type.',
            ]);
        }
    }
}
