<?php

namespace App\Models;

use App\Models\Concerns\BumpsIssueCache;
use Database\Factories\LabelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Label extends Model
{
    /** @use HasFactory<LabelFactory> */
    use BumpsIssueCache, HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'color',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function issues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_label');
    }
}
