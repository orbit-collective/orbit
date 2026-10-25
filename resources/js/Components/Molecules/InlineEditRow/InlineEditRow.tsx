import { KeyboardEvent, ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

/** Class for a borderless text field that only shows a line under it while focused. */
export const inlineFieldClass =
    'min-w-0 bg-transparent px-0 py-1 text-sm text-[var(--text-color)] outline-none ring-0 border-0 border-b border-solid border-transparent placeholder:text-[var(--text-muted-color)] transition-colors hover:border-[var(--border-color)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-0';

interface InlineEditRowProps {
    /** Sits before the fields: usually the appearance picker. */
    leading: ReactNode;
    /** The fields, laid out in one line. */
    children: ReactNode;
    /** Controls between the fields and the save/cancel buttons. */
    extras?: ReactNode;
    /** A second, quieter line of options under the fields (aligned with them). */
    below?: ReactNode;
    canSave: boolean;
    /** Names the save button for assistive tech ("Create priority"). */
    saveLabel: string;
    error?: string;
    onSave: () => void;
    onCancel: () => void;
}

/**
 * A list row in edit mode: the same height as the row it replaces, with Enter
 * to save and Escape to cancel, so editing never opens a form of its own.
 */
export default function InlineEditRow({
    leading,
    children,
    extras,
    below,
    canSave,
    saveLabel,
    error,
    onSave,
    onCancel,
}: InlineEditRowProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
            return;
        }

        // Enter inside a field saves; Enter on a button belongs to that button.
        if (
            event.key === 'Enter' &&
            (event.target as HTMLElement).tagName === 'INPUT'
        ) {
            event.preventDefault();
            if (canSave) onSave();
        }
    };

    return (
        <div
            onKeyDown={handleKeyDown}
            className="bg-[var(--accent-color)]/[0.06] border-l-2 border-solid border-[var(--accent-color)] py-2.5 pl-[calc(1rem-2px)] pr-4 sm:pl-[calc(1.25rem-2px)] sm:pr-5"
        >
            <div className="flex items-center gap-3">
                {leading}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                    {children}
                </div>
                {extras}
                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        title="Cancel"
                        aria-label="Cancel"
                        onClick={onCancel}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                    >
                        <Icon name="X" size={15} />
                    </button>
                    <button
                        type="button"
                        title={saveLabel}
                        aria-label={saveLabel}
                        disabled={!canSave}
                        onClick={onSave}
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                            canSave
                                ? 'cursor-pointer bg-[var(--accent-color)] text-white hover:opacity-90'
                                : 'cursor-not-allowed text-[var(--text-muted-color)] opacity-50',
                        )}
                    >
                        <Icon name="Check" size={15} />
                    </button>
                </div>
            </div>
            {below && <div className="mt-2.5 space-y-2.5 pl-12">{below}</div>}
            {error && (
                <p
                    role="alert"
                    className="mt-1.5 pl-12 text-xs text-[var(--error-color)]"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
