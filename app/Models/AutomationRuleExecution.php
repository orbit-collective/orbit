<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per (rule, idempotency key) that has actually run its actions.
 * The unique constraint on that pair is the entire idempotency guard - a
 * duplicate relay event (or any other retried trigger source) resolves to a
 * duplicate insert, which the dispatcher catches and treats as "already
 * executed", never as a signal to run the actions again.
 */
class AutomationRuleExecution extends Model
{
    protected $fillable = [
        'automation_rule_id',
        'idempotency_key',
        'executed_at',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public $timestamps = false;

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AutomationRule::class, 'automation_rule_id');
    }
}
