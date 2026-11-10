import { AnimatePresence, motion } from 'framer-motion';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import DashboardIssueRow, {
    DashboardIssueRowShow,
} from '@/Components/Molecules/DashboardIssueRow/DashboardIssueRow';
import { useElementWidth } from '@/hooks/useElementWidth';
import { useNow } from '@/hooks/useNow';
import { DashboardIssueRow as Row } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { MyIssuesSort, sortIssues } from '@/utils/dashboardIssues';
import { DURATION, EASE, rowDelay } from '@/utils/motion';

interface MyIssuesCardProps {
    issues: Row[];
    /** `list` is a row per issue, `compact` a tighter one, `cards` tiles in columns. */
    variant?: string;
    limit?: number;
    sort?: MyIssuesSort;
    showHeader?: boolean;
    show?: Partial<DashboardIssueRowShow>;
    now?: Date;
}

/** Below this width a row drops its project and puts the due date under the title. */
const NARROW = 360;

/** Tiles per row of the cards style, by the width of the card. */
const cardColumns = (width: number) =>
    width >= 640 ? 3 : width >= 400 ? 2 : 1;

/** The open issues assigned to the user, the most important first. */
const MyIssuesCard: FC<MyIssuesCardProps> = ({
    issues,
    variant = 'list',
    limit = 5,
    sort = 'priority',
    showHeader = true,
    show,
    now,
}) => {
    const [ref, width] = useElementWidth<HTMLDivElement>();
    const clock = useNow();
    const today = now ?? clock;
    const shown = sortIssues(issues, sort).slice(0, limit);
    const isCards = variant === 'cards';

    return (
        <div
            ref={ref}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4"
        >
            {showHeader && (
                <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        My Issues
                    </h3>
                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                        {issues.length === 0
                            ? 'Nothing assigned'
                            : `${shown.length} of ${issues.length} open`}
                    </span>
                </div>
            )}

            {shown.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.base, ease: EASE }}
                    className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center"
                >
                    <motion.span
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                            duration: 3,
                            ease: 'easeInOut',
                            repeat: Infinity,
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--success-color)]"
                    >
                        <Icon name="CircleCheck" size={20} />
                    </motion.span>
                    <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                        Nothing is waiting for you
                    </p>
                    <p className="m-0 max-w-[16rem] text-xs text-[var(--text-muted-color)]">
                        Open issues assigned to you show up here.
                    </p>
                </motion.div>
            ) : (
                <ul
                    role="list"
                    aria-label="Open issues assigned to you"
                    className={cn(
                        'm-0 grid min-h-0 flex-1 list-none content-start overflow-y-auto p-0',
                        isCards ? 'gap-2.5' : 'gap-0.5',
                    )}
                    style={{
                        gridTemplateColumns: `repeat(${isCards ? cardColumns(width) : 1}, minmax(0, 1fr))`,
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        {shown.map((issue, index) => (
                            <motion.li
                                key={issue.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{
                                    duration: DURATION.base,
                                    ease: EASE,
                                    delay: rowDelay(index),
                                }}
                                className="min-w-0"
                            >
                                <DashboardIssueRow
                                    issue={issue}
                                    density={
                                        isCards
                                            ? 'card'
                                            : variant === 'compact'
                                              ? 'compact'
                                              : 'row'
                                    }
                                    narrow={width > 0 && width < NARROW}
                                    show={show}
                                    now={today}
                                />
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            )}
        </div>
    );
};

export default MyIssuesCard;
