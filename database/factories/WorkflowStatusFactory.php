<?php

namespace Database\Factories;

use App\Enums\WorkflowStatusCategory;
use App\Models\IssueType;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkflowStatus>
 */
class WorkflowStatusFactory extends Factory
{
    protected $model = WorkflowStatus::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'issue_type_id' => IssueType::factory(),
            'name' => fake()->unique()->word(),
            'color' => fake()->hexColor(),
            'category' => fake()->randomElement(WorkflowStatusCategory::cases()),
            'sort_order' => 0,
            'is_initial' => false,
        ];
    }

    public function initial(): static
    {
        return $this->state(fn () => ['is_initial' => true, 'category' => WorkflowStatusCategory::TODO]);
    }
}
