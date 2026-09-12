<?php

namespace Database\Factories;

use App\Models\IssueType;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IssueType>
 */
class IssueTypeFactory extends Factory
{
    protected $model = IssueType::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->unique()->word(),
            'icon' => 'Bug',
            'color' => fake()->hexColor(),
            'description' => fake()->boolean(60) ? fake()->sentence() : null,
            'is_system' => false,
            'allows_children' => false,
            'required_fields' => [],
            'restricted_role_types' => [],
            'sort_order' => 0,
        ];
    }

    public function system(): static
    {
        return $this->state(fn () => ['is_system' => true]);
    }

    public function allowsChildren(): static
    {
        return $this->state(fn () => ['allows_children' => true]);
    }
}
