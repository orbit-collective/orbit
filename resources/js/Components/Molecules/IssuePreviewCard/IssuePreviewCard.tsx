import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { IssuePreviewCardProps } from '@/types/Components';
import { parseDateKey } from '@/utils/time';
import React, { useMemo } from 'react';

const CARD_WIDTH = 260;
const ESTIMATED_HEIGHT = 220;
const VIEWPORT_MARGIN = 12;

const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    closed: 'Closed',
};

const formatShort = (dateString: string) =>
    parseDateKey(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

const IssuePreviewCard: React.FC<IssuePreviewCardProps> = ({
    issue,
    anchorRect,
}) => {
    const position = useMemo(() => {
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const top =
            spaceBelow >= ESTIMATED_HEIGHT + VIEWPORT_MARGIN
                ? anchorRect.bottom + 8
                : Math.max(
                      anchorRect.top - ESTIMATED_HEIGHT - 8,
                      VIEWPORT_MARGIN,
                  );
        const left = Math.min(
            anchorRect.left,
            window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN,
        );

        return { top, left };
    }, [anchorRect]);

    const dateRange = useMemo(() => {
        if (!issue.start_date) return null;
        const start = formatShort(issue.start_date);
        if (!issue.end_date || issue.end_date === issue.start_date) {
            return start;
        }
        return `${start} – ${formatShort(issue.end_date)}`;
    }, [issue.start_date, issue.end_date]);

    return (
        <div
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: CARD_WIDTH,
                zIndex: 9999,
            }}
            className="animate-in fade-in zoom-in-95 pointer-events-none rounded-2xl border border-solid border-[var(--border-color)] bg-[var(--bg-dark-color)] p-3.5 shadow-2xl backdrop-blur-md duration-100"
        >
            <div className="flex items-start gap-2">
                <StatusDot
                    status={issue.priority}
                    size="sm"
                    className="mt-1.5 shrink-0"
                />
                <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[var(--text-color)]">
                    {issue.title}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-solid border-[var(--border-color)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                    <StatusDot status={issue.status} size="xs" />
                    {STATUS_LABELS[issue.status]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-solid border-[var(--border-color)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--text-gray-color)]">
                    <StatusDot status={issue.priority} size="xs" />
                    {issue.priority}
                </span>
            </div>

            {issue.labels && issue.labels.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                        <LabelBadge key={label} label={label} />
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-solid border-[var(--border-color)] pt-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                    {issue.assignee ? (
                        <>
                            <Avatar
                                src={issue.assignee.avatar ?? undefined}
                                alt={issue.assignee.name}
                                initials={issue.assignee.name.charAt(0)}
                                size="sm"
                            />
                            <span className="truncate text-[11px] font-medium text-[var(--text-color)]">
                                {issue.assignee.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <Icon
                                name="UserX"
                                size={13}
                                className="text-[var(--text-muted-color)]"
                            />
                            <span className="text-[11px] font-medium text-[var(--text-muted-color)]">
                                Unassigned
                            </span>
                        </>
                    )}
                </div>

                {dateRange && (
                    <div className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-[var(--text-muted-color)]">
                        <Icon name="CalendarRange" size={12} />
                        {dateRange}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IssuePreviewCard;
