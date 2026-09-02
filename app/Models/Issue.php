<?php

namespace App\Models;

use App\Enums\IssueLabel;
use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Casts\AsEnumArrayObject;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Issue extends Model
{
    /** @use HasFactory<IssueFactory> */
    use HasFactory;
    protected $fillable = [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'project_id',
        'parent_id',
        'user_id',
        'assignee_id',
        'labels',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'labels' => AsEnumArrayObject::class . ':' . IssueLabel::class,
            'tags' => 'array',
        ];
    }

    public function creator(): BelongsTo {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignee(): BelongsTo {
        return $this->belongsTo(User::class, 'assignee_id');
    }
    public function project(): BelongsTo {
        return $this->belongsTo(Project::class);
    }

    public function comments(): HasMany {
        return $this->hasMany(Comment::class);
    }

    public function parent(): BelongsTo {
        return $this->belongsTo(Issue::class, 'parent_id');
    }

    public function children(): HasMany {
        return $this->hasMany(Issue::class, 'parent_id');
    }

    public function externalLinks(): HasMany {
        return $this->hasMany(ExternalIssueLink::class);
    }
}
