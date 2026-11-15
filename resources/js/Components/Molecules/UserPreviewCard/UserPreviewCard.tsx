import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { UserPreviewCardProps } from '@/types/Components';
import { formatTimeAgo } from '@/utils/time';

const CARD_WIDTH = 280;
const ESTIMATED_HEIGHT = 200;
const VIEWPORT_MARGIN = 12;

const UserPreviewCard: React.FC<UserPreviewCardProps> = ({
    user,
    anchorRect,
}) => {
    const { t } = useLaravelReactI18n();
    const cardRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(ESTIMATED_HEIGHT);

    // The height depends on how many recent issues there are, so measure it
    // instead of guessing - an over-estimate leaves a gap above the anchor.
    useLayoutEffect(() => {
        const measured = cardRef.current?.offsetHeight;

        if (measured) setHeight(measured);
    }, [user]);

    const position = useMemo(() => {
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const top =
            spaceBelow >= height + VIEWPORT_MARGIN
                ? anchorRect.bottom + 8
                : Math.max(anchorRect.top - height - 8, VIEWPORT_MARGIN);
        const left = Math.max(
            VIEWPORT_MARGIN,
            Math.min(
                anchorRect.left,
                window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN,
            ),
        );

        return { top, left };
    }, [anchorRect, height]);

    return (
        <div
            ref={cardRef}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: CARD_WIDTH,
                zIndex: 9999,
            }}
            className="animate-in fade-in zoom-in-95 pointer-events-none rounded-2xl border border-solid border-(--border-color) bg-(--bg-dark-color) p-3.5 shadow-2xl backdrop-blur-md duration-100"
        >
            <div className="flex items-center gap-3">
                <Avatar
                    src={user.avatar ?? undefined}
                    alt={user.name}
                    initials={user.name.charAt(0)}
                    size="lg"
                />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-(--text-color)">
                        {user.name}
                    </span>
                    <span className="truncate text-[11px] text-(--text-gray-color)">
                        {user.email}
                    </span>
                </div>
            </div>

            <div className="mt-3 border-t border-(--border-color) pt-2.5">
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-(--text-muted-color) uppercase">
                    {t('user_preview_card.recent_issues')}
                </p>
                {user.recentIssues.length === 0 ? (
                    <p className="text-[11px] text-(--text-muted-color)">
                        {t('user_preview_card.no_recent_issues')}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-1.5">
                        {user.recentIssues.map((issue) => (
                            <li
                                key={issue.id}
                                className="flex items-center gap-2"
                            >
                                <StatusDot
                                    status={
                                        issue.workflowStatus?.category ?? 'todo'
                                    }
                                    size="xs"
                                    className="shrink-0"
                                />
                                <span className="shrink-0 text-[10px] font-medium text-(--text-muted-color)">
                                    #{issue.number}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-(--text-color)">
                                    {issue.title}
                                </span>
                                {issue.updated_at && (
                                    <span className="shrink-0 text-[10px] text-(--text-muted-color)">
                                        {formatTimeAgo(issue.updated_at, t)}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default UserPreviewCard;
