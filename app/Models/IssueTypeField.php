<?php

namespace App\Models;

use App\Enums\IssueFieldType;
use Database\Factories\IssueTypeFieldFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IssueTypeField extends Model
{
    /** @use HasFactory<IssueTypeFieldFactory> */
    use HasFactory;

    protected $fillable = [
        'issue_type_id',
        'label',
        'type',
        'options',
        'placeholder',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'type' => IssueFieldType::class,
        'options' => 'array',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function issueType(): BelongsTo
    {
        return $this->belongsTo(IssueType::class);
    }

    /** Matches resources/js/types/IssueTypes.ts's IssueTypeField. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'issueTypeId' => $this->issue_type_id,
            'label' => $this->label,
            'type' => $this->type->value,
            'options' => $this->options ?? [],
            'placeholder' => $this->placeholder,
            'isRequired' => $this->is_required,
        ];
    }
}
