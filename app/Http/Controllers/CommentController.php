<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Issue;
use App\Services\CommentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct(
        protected CommentService $commentService
    ) {}

    public function store(Request $request, Issue $issue): RedirectResponse
    {
        $this->authorize('create', [Comment::class, $issue]);

        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $this->commentService->addComment($issue, $data);

        return redirect()->back()
            ->with('success', 'Comment added.')
            ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
    }

    public function update(Request $request, Comment $comment): RedirectResponse
    {
        $this->authorize('update', $comment);

        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $this->commentService->updateComment($comment, $data);

        $issue = $comment->issue;

        return redirect()->back()
            ->with('success', 'Comment updated.')
            ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
    }

    public function destroy(Comment $comment): RedirectResponse
    {
        $this->authorize('delete', $comment);

        $issue = $comment->issue;

        $this->commentService->deleteComment($comment);

        return redirect()->back()
            ->with('success', 'Comment deleted.')
            ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
    }
}
