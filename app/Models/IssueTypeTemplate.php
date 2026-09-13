<?php

namespace App\Models;

use Database\Factories\IssueTypeTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IssueTypeTemplate extends Model
{
    /** @use HasFactory<IssueTypeTemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'issue_type_id',
        'name',
        'description',
        'default_priority',
        'default_labels',
    ];

    protected $casts = [
        'default_labels' => 'array',
    ];

    public function issueType(): BelongsTo
    {
        return $this->belongsTo(IssueType::class);
    }

    /** Matches resources/js/types/IssueTypes.ts's IssueTypeTemplate. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'issueTypeId' => $this->issue_type_id,
            'name' => $this->name,
            'description' => $this->description,
            'defaultPriority' => $this->default_priority,
            'defaultLabels' => $this->default_labels ?? [],
        ];
    }
}
