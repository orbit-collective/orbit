<?php

namespace Database\Factories;

use App\Models\IssueType;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkflowTransition>
 */
class WorkflowTransitionFactory extends Factory
{
    protected $model = WorkflowTransition::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $issueType = IssueType::factory()->create();

        return [
            'issue_type_id' => $issueType->id,
            'from_status_id' => WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]),
            'to_status_id' => WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]),
        ];
    }
}
