<?php

namespace Database\Factories;

use App\Enums\IssueFieldType;
use App\Models\IssueType;
use App\Models\IssueTypeField;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<IssueTypeField> */
class IssueTypeFieldFactory extends Factory
{
    protected $model = IssueTypeField::class;

    public function definition(): array
    {
        return [
            'issue_type_id' => IssueType::factory(),
            'label' => ucfirst($this->faker->unique()->word()),
            'type' => IssueFieldType::TEXT,
            'options' => [],
            'placeholder' => null,
            'is_required' => false,
            'sort_order' => 0,
        ];
    }
}
