import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueElement from '@/Components/Molecules/IssueElement/IssueElement';
import { BoardColumnProps } from '@/types/Components';
import { WorkflowStatusCategory } from '@/types/Workflow';
import { DURATION, EASE, SPRING, STAGGER } from '@/utils/motion';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

/** A priority column carries its own color; a status column maps onto a badge variant by its id. */
const isPriorityColumn = (id: string) => id.startsWith('priority-');

function BoardColumn({ issues, meta, count, index = 0 }: BoardColumnProps) {
    const { t } = useLaravelReactI18n();
    const { setNodeRef, isOver } = useDroppable({ id: meta.id });
    // A refresh plays the column's entrance again without remounting it, so
    // the scroll position of its cards survives (only the cards re-enter).
    const epoch = useRefreshEpoch();
    const rise = useAnimationControls();
    const indexRef = useRef(index);
    indexRef.current = index;
    const priorityColumn = isPriorityColumn(meta.id);

    useEffect(() => {
        rise.set({ opacity: 0, y: 18 });
        void rise.start({
            opacity: 1,
            y: 0,
            transition: {
                duration: DURATION.base,
                ease: EASE,
                delay: indexRef.current * STAGGER,
            },
        });
    }, [epoch, rise]);

    return (
        <motion.div
            ref={setNodeRef}
            initial={{ opacity: 0, y: 18 }}
            animate={rise}
            className="flex h-full w-[calc(100vw-3.5rem)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border transition-colors duration-150 sm:w-[336px]"
            style={{
                borderColor: isOver
                    ? `${meta.accent}66`
                    : 'var(--border-color)',
                backgroundColor: 'var(--bg-color-hover)',
                boxShadow: isOver
                    ? `0 0 0 1px ${meta.accent}33, 0 12px 24px -10px ${meta.accent}4d`
                    : '0 4px 10px -6px rgba(0,0,0,0.5)',
            }}
        >
            <div
                className="flex items-center gap-3 border-b border-(--border-color) px-4 py-3.5"
                style={{
                    background: `linear-gradient(180deg, ${meta.accent}12 0%, transparent 100%)`,
                }}
            >
                <div className={'flex w-full items-center justify-between'}>
                    <div className={'flex items-center gap-3'}>
                        <motion.div
                            key={epoch}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{
                                color: meta.accent,
                                backgroundColor: `${meta.accent}1f`,
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                ...SPRING,
                                delay: 0.15 + index * STAGGER,
                            }}
                        >
                            <Icon name={meta.icon} size={17} />
                        </motion.div>
                        <div className="min-w-0">
                            <h3 className="truncate text-[13px] leading-tight font-semibold text-(--text-color)">
                                {meta.label}
                            </h3>
                            <p className="truncate text-[11px] leading-tight text-(--text-muted-color)">
                                {meta.hint}
                            </p>
                        </div>
                    </div>
                    <Badge
                        color={
                            priorityColumn
                                ? undefined
                                : (meta.id as WorkflowStatusCategory)
                        }
                        style={
                            priorityColumn
                                ? {
                                      color: meta.accent,
                                      borderColor: `${meta.accent}33`,
                                      backgroundColor: `${meta.accent}14`,
                                  }
                                : undefined
                        }
                        variant="default"
                        className="ml-auto shrink-0 rounded-full font-semibold tabular-nums"
                    >
                        <AnimatedNumber value={count} />
                    </Badge>
                </div>
            </div>
            {issues.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-(--border-color-strong) bg-(--bg-light-color) text-(--text-muted-color)">
                        <Icon name="Inbox" size={20} />
                    </div>
                    <span className="text-xs font-medium text-(--text-muted-color)">
                        {t('board_column.empty')}
                    </span>
                </div>
            ) : (
                <div className="no-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto p-3 select-none">
                    <AnimatePresence initial={false}>
                        {issues.map((issue, cardIndex) => (
                            <IssueElement
                                key={issue.id}
                                issue={issue}
                                type="board"
                                index={cardIndex + index}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}

export default BoardColumn;
