import CommentItem from '@/Components/Molecules/CommentItem/CommentItem';
import { CommentListProps } from '@/types/Components';
import React from 'react';

const CommentList: React.FC<CommentListProps> = ({
    comments,
    onEdit,
    onDelete,
}) => {
    if (comments.length === 0) {
        return (
            <p className="text-sm italic text-[var(--text-gray-color)]">
                No activity yet.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default CommentList;
