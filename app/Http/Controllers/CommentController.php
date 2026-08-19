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
        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $this->commentService->addComment($issue, $data);

        return redirect()->back()
            ->with('success', 'Comment added.')
            ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
    }

    public function destroy(Comment $comment): RedirectResponse
    {
        abort_if($comment->user_id !== auth()->id(), 403);

        $issue = $comment->issue;

        $this->commentService->deleteComment($comment);

        return redirect()->back()
            ->with('success', 'Comment deleted.')
            ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
    }
}
