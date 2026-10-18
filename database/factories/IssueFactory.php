<?php

namespace Database\Factories;

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Issue>
 */
class IssueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'assignee_id' => fake()->boolean(90) ? User::factory() : null,
            'start_date' => now(),
            'end_date' => now()->addDays(rand(1, 30)),
        ];
    }

    public function todo(): static
    {
        return $this->inCategory(WorkflowStatusCategory::TODO);
    }

    public function inProgress(): static
    {
        return $this->inCategory(WorkflowStatusCategory::IN_PROGRESS);
    }

    public function done(): static
    {
        return $this->inCategory(WorkflowStatusCategory::DONE);
    }

    /**
     * Puts the issue on a workflow status of the given category, found or
     * created on the issue's own issue type (a plain "Task" type is made for
     * the project when the issue has none), so a test can state "a finished
     * issue" without building a workflow by hand.
     */
    public function inCategory(WorkflowStatusCategory $category): static
    {
        return $this->afterCreating(function (Issue $issue) use ($category) {
            $type = $issue->issueType
                ?? IssueType::query()->firstOrCreate(
                    ['project_id' => $issue->project_id, 'name' => 'Task'],
                    ['icon' => 'CheckSquare', 'color' => '#3b82f6', 'is_system' => true],
                );

            $status = WorkflowStatus::query()->firstOrCreate(
                ['issue_type_id' => $type->id, 'category' => $category],
                [
                    'name' => ucfirst(str_replace('_', ' ', $category->value)).' status',
                    'color' => '#94a3b8',
                    'is_initial' => $category === WorkflowStatusCategory::TODO,
                ],
            );

            $issue->forceFill(['issue_type_id' => $type->id, 'workflow_status_id' => $status->id])->save();
            $issue->unsetRelation('issueType')->unsetRelation('workflowStatus');
        });
    }
}
