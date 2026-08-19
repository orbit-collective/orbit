<?php

namespace App\Repositories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class ProjectRepository
{
    public function getAll(): Collection {
        return Project::query()->latest()->get();
    }
    public function findBySlug(string $slug): ?Project {
        return Project::query()->where('slug', $slug)->firstOrFail();
    }
    public function store(array $data): Project {
        return Project::query()->create($data);
    }
    public function update(Project $project, array $data): Project {
        $project->update($data);
        return $project;
    }
    public function hasAnyProjects(): bool {
        return Project::query()->exists();
    }
}
