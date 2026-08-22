<?php

namespace App\Repositories;

use App\Models\Comment;
use Illuminate\Support\Collection;

class CommentRepository
{
    public function getForIssue(int $issueId): Collection {
        return Comment::query()
            ->where('issue_id', $issueId)
            ->with('user')
            ->oldest()
            ->get();
    }
    public function store(array $data): Comment {
        return Comment::query()->create($data);
    }
    public function update(Comment $comment, array $data): Comment {
        $comment->update($data);

        return $comment;
    }
    public function delete(Comment $comment): void {
        $comment->delete();
    }
}
