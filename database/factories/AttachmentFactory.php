<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    public function definition(): array
    {
        $name = $this->faker->slug(2).'.png';

        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'disk' => 'public',
            'path' => 'attachments/1/'.$name,
            'url' => '/storage/attachments/1/'.$name,
            'original_name' => $name,
            'mime_type' => 'image/png',
            'size' => $this->faker->numberBetween(1024, 512000),
        ];
    }
}
