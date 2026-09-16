<?php

namespace App\Repositories;

use App\Models\Attachment;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class AttachmentRepository
{
    public function create(Project $project, array $data): Attachment
    {
        return $project->attachments()->create($data);
    }

    public function findForProject(Project $project, int $id): ?Attachment
    {
        return $project->attachments()->whereKey($id)->first();
    }

    /**
     * @return Collection<int, Attachment>
     */
    public function getForProject(Project $project): Collection
    {
        return $project->attachments()->latest()->get();
    }

    public function delete(Attachment $attachment): void
    {
        $attachment->delete();
    }
}
