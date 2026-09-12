<?php

namespace App\Repositories;

use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use Illuminate\Database\Eloquent\Collection;

class IssueTypeTemplateRepository
{
    public function getForType(IssueType $issueType): Collection
    {
        return $issueType->templates()->orderBy('name')->get();
    }

    public function findForType(IssueType $issueType, string $name): ?IssueTypeTemplate
    {
        return $issueType->templates()->where('name', $name)->first();
    }

    public function create(IssueType $issueType, array $data): IssueTypeTemplate
    {
        return $issueType->templates()->create($data);
    }

    public function update(IssueTypeTemplate $template, array $data): IssueTypeTemplate
    {
        $template->update($data);

        return $template;
    }

    public function delete(IssueTypeTemplate $template): void
    {
        $template->delete();
    }
}
