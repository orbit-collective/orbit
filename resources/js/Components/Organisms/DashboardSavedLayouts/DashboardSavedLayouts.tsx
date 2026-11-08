import { AnimatePresence, motion } from 'framer-motion';
import { FC, FormEvent, useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import LayoutPreview from '@/Components/Molecules/LayoutPreview/LayoutPreview';
import { DashboardSavedLayout } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE } from '@/utils/motion';

/** The longest a name may be, as on the server. */
const SAVED_LAYOUT_NAME_MAX = 40;

interface DashboardSavedLayoutsProps {
    layouts: DashboardSavedLayout[];
    /** Why the last save failed, from the server. */
    error?: string | null;
    onSave: (name: string) => void;
    onApply: (layout: DashboardSavedLayout) => void;
    onDelete: (id: number) => void;
}

const SMALL_BUTTON = cn(
    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--border-color)] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-40',
    FOCUS_RING,
);

/**
 * The layouts a user saved: keep the one being edited under a name, put one
 * of them on the dashboard being edited, or delete it. Saving under a name
 * that exists replaces that layout.
 */
const DashboardSavedLayouts: FC<DashboardSavedLayoutsProps> = ({
    layouts,
    error = null,
    onSave,
    onApply,
    onDelete,
}) => {
    const [name, setName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
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
                {error ? (
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
                    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-muted-color)]">
                            <Icon name="Bookmark" size={20} />
                        </span>
                        <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                            No saved layouts yet
                        </p>
                        <p className="m-0 text-xs text-[var(--text-muted-color)]">
                            Arrange the dashboard, give it a name and come back
                            to it whenever you like.
                        </p>
                    </div>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        <AnimatePresence initial={false} mode="popLayout">
                            {layouts.map((layout) => (
                                <motion.li
                                    key={layout.id}
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: DURATION.base,
                                        ease: EASE,
                                    }}
                                    className="flex flex-col gap-2.5 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-2.5"
                                >
                                    <LayoutPreview widgets={layout.widgets} />
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-[var(--text-color)]">
                                                {layout.name}
                                            </span>
                                            <span className="block text-[11px] text-[var(--text-muted-color)]">
                                                {
                                                    layout.widgets.filter(
                                                        (widget) =>
                                                            widget.visible,
                                                    ).length
                                                }{' '}
                                                widgets
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            {confirmingId === layout.id ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        aria-label={`Confirm deleting ${layout.name}`}
                                                        onClick={() => {
                                                            setConfirmingId(
                                                                null,
                                                            );
                                                            onDelete(layout.id);
                                                        }}
                                                        className={cn(
                                                            'cursor-pointer rounded-lg border-none bg-[var(--error-color)] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110',
                                                            FOCUS_RING,
                                                        )}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingId(
                                                                null,
                                                            )
                                                        }
                                                        className={SMALL_BUTTON}
                                                    >
                                                        Keep
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        aria-label={`Delete ${layout.name}`}
                                                        title="Delete"
                                                        onClick={() =>
                                                            setConfirmingId(
                                                                layout.id,
                                                            )
                                                        }
                                                        className={cn(
                                                            SMALL_BUTTON,
                                                            'px-2',
                                                        )}
                                                    >
                                                        <Icon
                                                            name="Trash"
                                                            size={13}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label={`Apply ${layout.name}`}
                                                        onClick={() =>
                                                            onApply(layout)
                                                        }
                                                        className={SMALL_BUTTON}
                                                    >
                                                        <Icon
                                                            name="LayoutTemplate"
                                                            size={13}
                                                        />
                                                        Apply
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </section>
        </div>
    );
};

export default DashboardSavedLayouts;
