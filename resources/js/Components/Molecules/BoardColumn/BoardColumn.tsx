import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueElement from '@/Components/Molecules/IssueElement/IssueElement';
import { BoardColumnProps } from '@/types/Components';
import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';

function BoardColumn({ issues, meta, count }: BoardColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: meta.id });

    return (
        <div
            ref={setNodeRef}
            className="flex h-full w-[calc(100vw-3.5rem)] flex-shrink-0 snap-center flex-col overflow-hidden rounded-2xl border transition-colors duration-150 sm:w-[336px]"
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
                className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3.5"
                style={{
                    background: `linear-gradient(180deg, ${meta.accent}12 0%, transparent 100%)`,
                }}
            >
                <div className={'flex w-full items-center justify-between'}>
                    <div className={'flex items-center gap-3'}>
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{
                                color: meta.accent,
                                backgroundColor: `${meta.accent}1f`,
                            }}
                        >
                            <Icon name={meta.icon} size={17} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-semibold leading-tight text-[var(--text-color)]">
                                {meta.label}
                            </h3>
                            <p className="truncate text-[11px] leading-tight text-[var(--text-muted-color)]">
                                {meta.hint}
                            </p>
                        </div>
                    </div>
                    <Badge
                        color={meta.id}
                        variant="default"
                        className="ml-auto shrink-0 rounded-full font-semibold tabular-nums"
                    >
                        {count}
                    </Badge>
                </div>
            </div>
            {issues.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[var(--border-color-strong)] bg-[var(--bg-light-color)] text-[var(--text-muted-color)]">
                        <Icon name="Inbox" size={20} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted-color)]">
                        No issues
                    </span>
                </div>
            ) : (
                <div className="no-scrollbar flex flex-1 select-none flex-col gap-2.5 overflow-y-auto p-3">
                    <AnimatePresence initial={false}>
                        {issues.map((issue) => (
                            <IssueElement
                                key={issue.id}
                                issue={issue}
                                type="board"
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default BoardColumn;
