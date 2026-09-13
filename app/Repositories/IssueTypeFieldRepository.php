<?php

namespace App\Repositories;

use App\Models\IssueType;
use App\Models\IssueTypeField;
use Illuminate\Database\Eloquent\Collection;

class IssueTypeFieldRepository
{
    /** @return Collection<int, IssueTypeField> */
    public function getForType(IssueType $issueType): Collection
    {
        return $issueType->fields()->orderBy('sort_order')->orderBy('id')->get();
    }

    public function create(IssueType $issueType, array $data): IssueTypeField
    {
        return $issueType->fields()->create($data);
    }

    public function update(IssueTypeField $field, array $data): IssueTypeField
    {
        $field->update($data);

        return $field;
    }

    public function delete(IssueTypeField $field): void
    {
        $field->delete();
    }

    public function nextSortOrder(IssueType $issueType): int
    {
        return (int) $issueType->fields()->max('sort_order') + 1;
    }
}
