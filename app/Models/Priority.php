<?php

namespace App\Models;

use App\Models\Concerns\BumpsIssueCache;
use Database\Factories\PriorityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Priority extends Model
{
    /** @use HasFactory<PriorityFactory> */
    use BumpsIssueCache, HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'color',
        'icon',
        'position',
        'is_default',
    ];

    protected $casts = [
        'position' => 'integer',
        'is_default' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** The option shape the pickers and the settings tab use: the details plus the default flag. */
    public function toOption(): array
    {
        return [...$this->toDetails(), 'isDefault' => $this->is_default];
    }

    /**
     * The compact shape every payload that shows a priority uses, so an issue
     * row can draw its icon and color without a lookup into the project's
     * list (which a cross-project page does not have).
     *
     * @return array{id: int, name: string, color: string, icon: string, position: int}
     */
    public function toDetails(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'color' => $this->color,
            'icon' => $this->icon,
            'position' => $this->position,
        ];
    }
}
