<?php

namespace Database\Factories;

use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IssueTypeTemplate>
 */
class IssueTypeTemplateFactory extends Factory
{
    protected $model = IssueTypeTemplate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'issue_type_id' => IssueType::factory(),
            'name' => fake()->unique()->word(),
            'description' => fake()->paragraph(),
            'default_priority' => fake()->randomElement(['low', 'medium', 'high']),
            'default_labels' => [],
        ];
    }
}
