import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import LabelList from '@/Components/Molecules/LabelList/LabelList';
import { BoardCardProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { formatStatusLabel } from '@/utils/text';
import { boardCardVariants } from '@/utils/variants';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

const BoardCardContent = ({
    issue,
    isClosed,
}: {
    issue: Issue;
    isClosed: boolean;
}) => (
    <>
        <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
                <StatusDot status={isClosed ? issue.status : issue.priority} />
                <span className="truncate text-[11px] font-semibold text-[var(--text-muted-color)]">
                    {issue.assignee?.name || 'Unassigned'}
                </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] font-medium text-[var(--text-muted-color)]">
                #{issue.id}
            </span>
        </div>
        <h4
            className={cn(
                'line-clamp-2 text-[13px] font-medium leading-snug text-[var(--text-color)]',
                isClosed && 'text-[var(--text-muted-color)] line-through',
            )}
        >
            {issue.title}
        </h4>
        {issue.labels && issue.labels.length > 0 && (
            <LabelList
                labels={issue.labels}
                badgeClassName="px-1.5 py-0.5 text-[9px]"
            />
        )}
        <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-2.5">
            <Badge
                color={issue.status}
                variant="default"
                className="flex items-center gap-1.5"
            >
                <StatusDot status={issue.status} />
                <span>{formatStatusLabel(issue.status)}</span>
            </Badge>
            {issue.assignee ? (
                <Avatar
                    src={issue.assignee.avatar}
                    alt={issue.assignee.name}
                    initials={issue.assignee.name.charAt(0)}
                    size="sm"
                />
            ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-[var(--border-color-strong)] bg-[var(--surface-color)] text-[8px] text-[var(--text-muted-color)]">
                    -
                </div>
            )}
        </div>
    </>
);

export const BoardCard = ({ issue, onClick, isClosed }: BoardCardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({ id: issue.id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={isDragging ? 'relative z-10' : undefined}
        >
            {/*
                The drag offset above must track the pointer 1:1 with no easing —
                only the *layout reflow* (siblings shifting on insert/remove) gets
                a spring. Mixing both on one node makes the card visibly lag
                behind the cursor and leaves a smeared "ghost" trail, so `layout`
                is disabled for the duration of an active drag.
            */}
            <motion.div
                layout={!isDragging}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 40,
                    mass: 0.5,
                }}
                onClick={onClick}
                className={cn(
                    boardCardVariants({ isActive: false, isClosed }),
                    isDragging && 'opacity-30',
                )}
                {...attributes}
                {...listeners}
            >
                <BoardCardContent issue={issue} isClosed={isClosed} />
            </motion.div>
        </div>
    );
};

export const BoardCardOverlay = ({
    issue,
    isClosed,
}: {
    issue: Issue;
    isClosed: boolean;
}) => (
    <div
        className={cn(
            boardCardVariants({ isActive: false, isClosed }),
            'ring-[var(--accent-color)]/40 w-[300px] rotate-2 cursor-grabbing shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)] ring-1',
        )}
    >
        <BoardCardContent issue={issue} isClosed={isClosed} />
    </div>
);
