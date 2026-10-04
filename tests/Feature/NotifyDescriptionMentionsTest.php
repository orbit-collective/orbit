<?php

use App\Events\IssueCreated;
use App\Events\IssueMentioned;
use App\Events\IssueUpdated;
use App\Listeners\NotifyDescriptionMentions;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->actor = User::factory()->create();
    $this->member = User::factory()->create();
    $this->outsider = User::factory()->create();
    $this->project->users()->attach($this->actor->id, ['role' => 'member']);
    $this->project->users()->attach($this->member->id, ['role' => 'member']);
    $this->listener = app(NotifyDescriptionMentions::class);
    Event::fake([IssueMentioned::class]);
});

function mentionToken(User $user): string
{
    return "@[$user->name]($user->id)";
}

test('a member mentioned in a new issue description is notified without a comment', function () {
    $issue = Issue::factory()->create([
        'project_id' => $this->project->id,
        'description' => 'ping '.mentionToken($this->member),
    ]);

    $this->listener->handle(new IssueCreated($issue, $this->actor));

    Event::assertDispatched(IssueMentioned::class, fn (IssueMentioned $event) => $event->mentionedUser->is($this->member)
        && $event->comment === null
        && $event->actor->is($this->actor));
});

test('the actor and users outside the project are never notified', function () {
    $issue = Issue::factory()->create([
        'project_id' => $this->project->id,
        'description' => mentionToken($this->actor).' '.mentionToken($this->outsider),
    ]);

    $this->listener->handle(new IssueCreated($issue, $this->actor));

    Event::assertNotDispatched(IssueMentioned::class);
});

test('only mentions added by an edit are notified, not ones already in the description', function () {
    $other = User::factory()->create();
    $this->project->users()->attach($other->id, ['role' => 'member']);
    $old = 'hi '.mentionToken($this->member);
    $issue = Issue::factory()->create([
        'project_id' => $this->project->id,
        'description' => $old.' and '.mentionToken($other),
    ]);

    $this->listener->handle(new IssueUpdated($issue, $this->actor, [
        'description' => ['old' => $old, 'new' => $issue->description, 'text' => 'description was updated'],
    ]));

    Event::assertDispatchedTimes(IssueMentioned::class, 1);
    Event::assertDispatched(IssueMentioned::class, fn (IssueMentioned $event) => $event->mentionedUser->is($other));
});

test('an update that does not touch the description notifies nobody', function () {
    $issue = Issue::factory()->create([
        'project_id' => $this->project->id,
        'description' => mentionToken($this->member),
    ]);

    $this->listener->handle(new IssueUpdated($issue, $this->actor, [
        'title' => ['old' => 'a', 'new' => 'b', 'text' => 'title changed'],
    ]));

    Event::assertNotDispatched(IssueMentioned::class);
});

test('editing the description through the API notifies the newly mentioned member', function () {
    $issue = Issue::factory()->create(['project_id' => $this->project->id, 'description' => 'plain']);

    $this->actingAs($this->actor)
        ->patch("/issues/$issue->id", ['description' => 'hey '.mentionToken($this->member)])
        ->assertRedirect();

    Event::assertDispatched(IssueMentioned::class, fn (IssueMentioned $event) => $event->mentionedUser->is($this->member));
});
