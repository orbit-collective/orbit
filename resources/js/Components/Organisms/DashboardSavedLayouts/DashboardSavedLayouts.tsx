import { AnimatePresence, motion } from 'framer-motion';
import { FC, FormEvent, useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import LayoutPreview from '@/Components/Molecules/LayoutPreview/LayoutPreview';
import { DashboardSavedLayout, DashboardWidget } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { sameLayout } from '@/utils/dashboardLayout';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, SPRING } from '@/utils/motion';

/** The longest a name may be, as on the server. */
const SAVED_LAYOUT_NAME_MAX = 40;

interface DashboardSavedLayoutsProps {
    layouts: DashboardSavedLayout[];
    /** The layout being edited, to tell which saved layout it is. */
    currentWidgets: DashboardWidget[];
    /** Why the last change failed, from the server. */
    error?: string | null;
    onSave: (name: string) => void;
    onApply: (layout: DashboardSavedLayout) => void;
    onRename: (id: number, name: string) => void;
    /** Replace a saved layout with the one being edited. */
    onOverwrite: (id: number) => void;
    onDelete: (id: number) => void;
}

const SMALL_BUTTON = cn(
    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--border-color)] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-40',
    FOCUS_RING,
);

const ICON_BUTTON = cn(SMALL_BUTTON, 'px-2');

interface SavedLayoutCardProps {
    layout: DashboardSavedLayout;
    current: boolean;
    renaming: boolean;
    /** Why renaming failed, shown while it is being done. */
    renameError: string | null;
    onStartRename: () => void;
    onStopRename: () => void;
    onApply: () => void;
    onRename: (name: string) => void;
    onOverwrite: () => void;
    onDelete: () => void;
}

/** One saved layout: its picture, its name and what can be done with it. */
const SavedLayoutCard: FC<SavedLayoutCardProps> = ({
    layout,
    current,
    renaming,
    renameError,
    onStartRename,
    onStopRename,
    onApply,
    onRename,
    onOverwrite,
    onDelete,
}) => {
    const [pending, setPending] = useState<'update' | 'delete' | null>(null);
    const [name, setName] = useState(layout.name);
    const [renameSent, setRenameSent] = useState(false);
    const [applied, setApplied] = useState(false);

    // The renamed layout arrived: done. A failure keeps the name open.
    useEffect(() => {
        if (!renameSent) return;

        setRenameSent(false);
        if (!renameError) onStopRename();
    }, [layout, renameError]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (renaming) setName(layout.name);
    }, [renaming]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!applied) return;

        const timer = setTimeout(() => setApplied(false), 1600);

        return () => clearTimeout(timer);
    }, [applied]);

    const submitRename = (event: FormEvent) => {
        event.preventDefault();

        const trimmed = name.trim();

        if (trimmed === '' || trimmed === layout.name) {
            onStopRename();

            return;
        }

        setRenameSent(true);
        onRename(trimmed);
    };

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className={cn(
                'flex flex-col gap-2.5 rounded-xl border border-solid bg-[var(--surface-color)] p-2.5 transition-colors',
                current
                    ? 'border-[var(--accent-color)]'
                    : 'border-[var(--border-color)] hover:border-[var(--border-color-strong)]',
            )}
        >
            <LayoutPreview widgets={layout.widgets} />

            {renaming ? (
                <form onSubmit={submitRename} className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                        <Input
                            id={`rename-layout-${layout.id}`}
                            value={name}
                            onChange={(event) =>
                                setName(
                                    event.target.value.slice(
                                        0,
                                        SAVED_LAYOUT_NAME_MAX,
                                    ),
                                )
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') onStopRename();
                            }}
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            aria-label={`Save the name of ${layout.name}`}
                            className={cn(
                                'flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-[var(--accent-color)] px-2.5 text-white hover:bg-[var(--accent-light-color)]',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="Check" size={14} />
                        </button>
                        <button
                            type="button"
                            aria-label="Cancel renaming"
                            onClick={onStopRename}
                            className={ICON_BUTTON}
                        >
                            <Icon name="X" size={14} />
                        </button>
                    </div>
                    {renameError && (
                        <p
                            role="alert"
                            className="m-0 text-[11px] text-[var(--error-color)]"
                        >
                            {renameError}
                        </p>
                    )}
                </form>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-[var(--text-color)]">
                                {layout.name}
                            </span>
                            {current && (
                                <motion.span
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={SPRING}
                                    className="shrink-0 rounded-full bg-[var(--accent-color-opacity)] px-1.5 text-[10px] font-semibold text-[var(--accent-color)]"
                                >
                                    Current
                                </motion.span>
                            )}
                        </span>
                        <span className="block text-[11px] text-[var(--text-muted-color)]">
                            {
                                layout.widgets.filter(
                                    (widget) => widget.visible,
                                ).length
                            }{' '}
                            widgets
                        </span>
                    </span>
                </div>
            )}

            {!renaming && (
                <motion.div
                    key={pending ?? 'actions'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASE }}
                    className="flex items-center justify-between gap-2"
                >
                    {pending ? (
                        <>
                            <span className="text-[11px] text-[var(--text-gray-color)]">
                                {pending === 'delete'
                                    ? 'Delete this layout?'
                                    : 'Replace it with the current layout?'}
                            </span>
                            <span className="flex shrink-0 gap-1.5">
                                <button
                                    type="button"
                                    aria-label={
                                        pending === 'delete'
                                            ? `Confirm deleting ${layout.name}`
                                            : `Confirm replacing ${layout.name}`
                                    }
                                    onClick={() => {
                                        const action = pending;

                                        setPending(null);
                                        if (action === 'delete') onDelete();
                                        else onOverwrite();
                                    }}
                                    className={cn(
                                        'cursor-pointer rounded-lg border-none px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110',
                                        pending === 'delete'
                                            ? 'bg-[var(--error-color)]'
                                            : 'bg-[var(--accent-color)]',
                                        FOCUS_RING,
                                    )}
                                >
                                    {pending === 'delete'
                                        ? 'Delete'
                                        : 'Replace'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPending(null)}
                                    className={SMALL_BUTTON}
                                >
                                    Keep
                                </button>
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="flex gap-1.5">
                                <button
                                    type="button"
                                    aria-label={`Rename ${layout.name}`}
                                    title="Rename"
                                    onClick={onStartRename}
                                    className={ICON_BUTTON}
                                >
                                    <Icon name="Pencil" size={13} />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Replace ${layout.name} with the current layout`}
                                    title={
                                        current
                                            ? 'It already is the current layout'
                                            : 'Replace with the current layout'
                                    }
                                    disabled={current}
                                    onClick={() => setPending('update')}
                                    className={ICON_BUTTON}
                                >
                                    <Icon name="RefreshCw" size={13} />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Delete ${layout.name}`}
                                    title="Delete"
                                    onClick={() => setPending('delete')}
                                    className={ICON_BUTTON}
                                >
                                    <Icon name="Trash" size={13} />
                                </button>
                            </span>
                            <button
                                type="button"
                                aria-label={`Apply ${layout.name}`}
                                onClick={() => {
                                    onApply();
                                    setApplied(true);
                                }}
                                className={cn(
                                    SMALL_BUTTON,
                                    applied &&
                                        'border-[var(--success-color)] text-[var(--success-color)]',
                                )}
                            >
                                <Icon
                                    name={applied ? 'Check' : 'LayoutTemplate'}
                                    size={13}
                                />
                                {applied ? 'Applied' : 'Apply'}
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </motion.li>
    );
};

/**
 * The layouts a user saved: keep the one being edited under a name, put one
 * of them on the dashboard being edited, rename it, replace it with the one
 * being edited, or delete it. Saving under a name that exists replaces that
 * layout.
 */
const DashboardSavedLayouts: FC<DashboardSavedLayoutsProps> = ({
    layouts,
    currentWidgets,
    error = null,
    onSave,
    onApply,
    onRename,
    onOverwrite,
    onDelete,
}) => {
    const [name, setName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const trimmed = name.trim();
    const replaces = layouts.some((layout) => layout.name === trimmed);

    // The layouts arrived after a save: the name did its job.
    useEffect(() => {
        if (!submitted) return;

        setSubmitted(false);
        if (!error) setName('');
    }, [layouts, error]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (trimmed === '') return;

        setSubmitted(true);
        onSave(trimmed);
    };

    return (
        <div className="flex flex-col gap-5">
            <form onSubmit={submit} className="flex flex-col gap-2">
                <label
                    htmlFor="saved-layout-name"
                    className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]"
                >
                    Save this layout as
                </label>
                <div className="flex gap-2">
                    <Input
                        id="saved-layout-name"
                        value={name}
                        onChange={(event) =>
                            setName(
                                event.target.value.slice(
                                    0,
                                    SAVED_LAYOUT_NAME_MAX,
                                ),
                            )
                        }
                        placeholder="e.g. Focus"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={trimmed === ''}
                        className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-light-color)] disabled:cursor-not-allowed disabled:bg-[var(--pending-color)]',
                            FOCUS_RING,
                        )}
                    >
                        <Icon name="BookmarkPlus" size={13} />
                        {replaces ? 'Replace' : 'Save'}
                    </button>
                </div>
                {error && renamingId === null ? (
                    <p
                        role="alert"
                        className="m-0 text-[11px] text-[var(--error-color)]"
                    >
                        {error}
                    </p>
                ) : (
                    replaces && (
                        <p className="m-0 text-[11px] text-[var(--text-muted-color)]">
                            A layout with this name exists and will be replaced.
                        </p>
                    )
                )}
            </form>

            <section className="flex flex-col gap-2">
                <h4 className="m-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                    Saved layouts
                </h4>
                {layouts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.base, ease: EASE }}
                        className="flex flex-col items-center gap-3 px-4 py-8 text-center"
                    >
                        <motion.span
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                                duration: 3,
                                ease: 'easeInOut',
                                repeat: Infinity,
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-muted-color)]"
                        >
                            <Icon name="Bookmark" size={20} />
                        </motion.span>
                        <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                            No saved layouts yet
                        </p>
                        <p className="m-0 text-xs text-[var(--text-muted-color)]">
                            Arrange the dashboard, give it a name and come back
                            to it whenever you like.
                        </p>
                    </motion.div>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        <AnimatePresence initial={false} mode="popLayout">
                            {layouts.map((layout) => (
                                <SavedLayoutCard
                                    key={layout.id}
                                    layout={layout}
                                    current={sameLayout(
                                        layout.widgets,
                                        currentWidgets,
                                    )}
                                    renaming={renamingId === layout.id}
                                    renameError={
                                        renamingId === layout.id ? error : null
                                    }
                                    onStartRename={() =>
                                        setRenamingId(layout.id)
                                    }
                                    onStopRename={() => setRenamingId(null)}
                                    onApply={() => onApply(layout)}
                                    onRename={(next) =>
                                        onRename(layout.id, next)
                                    }
                                    onOverwrite={() => onOverwrite(layout.id)}
                                    onDelete={() => onDelete(layout.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </section>
        </div>
    );
};

export default DashboardSavedLayouts;
