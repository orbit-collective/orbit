import Avatar from '@/Components/Atoms/Avatar/Avatar';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { CommentItemProps } from '@/types/Components';
import { formatTimeAgo } from '@/utils/time';
import React from 'react';

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="group flex gap-3">
            <Avatar
                src={comment.user?.avatar}
                initials={comment.user?.name.charAt(0) ?? '?'}
                size="sm"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-color)]">
                        {comment.user?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-[var(--text-gray-color)]">
                        {formatTimeAgo(comment.created_at)} ago
                    </span>
                </div>
                <EditableText
                    value={comment.body}
                    onSave={(body) => onEdit?.(comment, body)}
                    multiline
                    disabled={!comment.can_edit}
                    displayClassName="whitespace-pre-wrap text-sm text-[var(--text-color)]"
                />
            </div>
            <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100">
                {comment.can_delete && (
                    <IconButton
                        iconName="Trash2"
                        iconSize={14}
                        ariaLabel="Delete comment"
                        onClick={() => onDelete?.(comment)}
                    />
                )}
            </div>
        </div>
    );
};

export default CommentItem;
