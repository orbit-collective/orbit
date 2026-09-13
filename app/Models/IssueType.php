<?php

namespace App\Models;

use Database\Factories\IssueTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IssueType extends Model
{
    /** @use HasFactory<IssueTypeFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'icon',
        'color',
        'description',
        'is_system',
        'allows_children',
        'is_top_level',
        'required_fields',
        'restricted_role_types',
        'sort_order',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'allows_children' => 'boolean',
        'is_top_level' => 'boolean',
        'required_fields' => 'array',
        'restricted_role_types' => 'array',
        'sort_order' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(WorkflowStatus::class);
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(IssueTypeTemplate::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }

    /**
     * The specific set of types that may be created as a sub-issue of this
     * one. An empty set means "unrestricted" - any type is allowed as a
     * child, as long as this type's allows_children flag is on - see
     * IssueService::assertValidParent(). Configuring at least one row here
     * narrows that down to only the configured types.
     */
    public function allowedChildTypes(): BelongsToMany
    {
        return $this->belongsToMany(
            IssueType::class,
            'issue_type_children',
            'issue_type_id',
            'child_issue_type_id',
        );
    }

    /**
     * The exact shape of resources/js/types/IssueTypes.ts's IssueType, so a
     * type serializes identically whether it is sent as a top-level prop or
     * nested inside an issue. Relation-backed keys are only present when the
     * relation was eager-loaded, which is what makes the lighter payload on
     * Projects/Show possible without a second mapping helper.
     */
    public function toArray(): array
    {
        $array = [
            'id' => $this->id,
            'name' => $this->name,
            'icon' => $this->icon,
            'color' => $this->color,
            'description' => $this->description,
            'isSystem' => $this->is_system,
            'allowsChildren' => $this->allows_children,
            'isTopLevel' => $this->is_top_level,
            'requiredFields' => $this->required_fields ?? [],
            'restrictedRoleTypes' => $this->restricted_role_types ?? [],
        ];

        if ($this->relationLoaded('statuses')) {
            $array['statuses'] = $this->statuses->toArray();
        }

        if ($this->relationLoaded('transitions')) {
            $array['transitions'] = $this->transitions->toArray();
        }

        if ($this->relationLoaded('templates')) {
            $array['templates'] = $this->templates->toArray();
        }

        if ($this->relationLoaded('allowedChildTypes')) {
            $array['allowedChildTypeIds'] = $this->allowedChildTypes->pluck('id')->values()->all();
        }

        return $array;
    }
}
