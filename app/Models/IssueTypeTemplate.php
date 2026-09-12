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
}
