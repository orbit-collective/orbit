import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import CommentItem from '@/Components/Molecules/CommentItem/CommentItem';
import { CommentListProps } from '@/types/Components';

const CommentList: React.FC<CommentListProps> = ({
    comments,
    users,
    projectId,
    onEdit,
    onDelete,
    onImageUpload,
}) => {
    if (comments.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                <Icon
                    name="MessageSquare"
                    size={22}
                    className="text-[var(--text-muted-color)]"
                />
                <p className="text-xs font-medium text-[var(--text-muted-color)]">
                    No comments yet
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    users={users}
                    projectId={projectId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                />
            ))}
        </div>
    );
};

export default CommentList;
