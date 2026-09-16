import Avatar from '@/Components/Atoms/Avatar/Avatar';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { CommentItemProps } from '@/types/Components';
import { splitMarkdownImages } from '@/utils/imagePaste';
import { splitMentionText } from '@/utils/mentions';
import { formatTimeAgo } from '@/utils/time';
import React from 'react';

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    users = [],
    onEdit,
    onDelete,
    onImageUpload,
}) => {
    const renderText = (value: string, keyPrefix: string) =>
        splitMentionText(value, users).map((segment, index) =>
            segment.type === 'mention' ? (
                <span
                    key={`${keyPrefix}-${index}`}
                    className="bg-[var(--accent-color)]/10 mx-0.5 inline-flex items-center gap-1 rounded px-1 align-middle font-medium text-[var(--accent-color)]"
                >
                    <Avatar
                        src={segment.avatar ?? undefined}
                        initials={segment.name.charAt(0)}
                        size="sm"
                    />
                    {segment.value}
                </span>
            ) : (
                <React.Fragment key={`${keyPrefix}-${index}`}>
                    {segment.value}
                </React.Fragment>
            ),
        );

    const renderBody = (value: string) =>
        splitMarkdownImages(value).map((segment, index) =>
            segment.type === 'image' ? (
                // Stops the click from reaching EditableText's edit-on-click
                // wrapper - clicking a picture opens it, it doesn't start an
                // edit the way clicking the text around it does.
                <a
                    key={index}
                    href={segment.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="my-1 block w-fit"
                >
                    <img
                        src={segment.url}
                        alt={segment.value}
                        className="max-h-80 max-w-full rounded-lg border border-[var(--border-color)]"
                    />
                </a>
            ) : (
                renderText(segment.value, String(index))
            ),
        );

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
                    onImageUpload={onImageUpload}
                    multiline
                    disabled={!comment.can_edit}
                    displayClassName="whitespace-pre-wrap text-sm text-[var(--text-color)]"
                    renderDisplay={renderBody}
                />
            </div>
            <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100">
                {comment.can_delete && (
                    <IconButton
                        iconName="Trash"
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
