<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\Middleware\RateLimited;

class ProjectInvitationMail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(
        public readonly Project $project,
        public readonly User $invitedBy,
        public readonly string $acceptUrl,
    ) {}

    public function backoff(): array
    {
        return [10, 30, 60, 120];
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function middleware(object $notifiable, string $channel): array
    {
        return match ($channel) {
            'mail' => [new RateLimited('emails')],
            default => [],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("You've been invited to join \"{$this->project->name}\" on Orbit")
            ->view('emails.project-invitation', [
                'project' => $this->project,
                'invitedBy' => $this->invitedBy,
                'acceptUrl' => $this->acceptUrl,
            ]);
    }
}
