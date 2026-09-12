import Icon from '@/Components/Atoms/Icon/Icon';
import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';

export interface QuickAddIssueRowHandle {
    open: () => void;
}

interface QuickAddIssueRowProps {
    colSpan: number;
    onSubmit: (title: string) => void;
    isSubmitting?: boolean;
    label?: string;
    indent?: number;
}

/**
 * Jira-style inline "quick add": collapsed to a plain "+ New issue" link by
 * default, expands into a title-only input on click (or via the `open()`
 * handle, used by the global "New issue" shortcut). Submitting only sends
 * the title - everything else is filled in later from the issue detail
 * view, which is unchanged.
 */
export const QuickAddIssueRow = forwardRef<
    QuickAddIssueRowHandle,
    QuickAddIssueRowProps
>(
    (
        {
            colSpan,
            onSubmit,
            isSubmitting = false,
            label = 'New issue',
            indent = 0,
        },
        ref,
    ) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const inputRef = useRef<HTMLInputElement>(null);

        const reveal = () => {
            setIsEditing(true);
            requestAnimationFrame(() => inputRef.current?.focus());
        };

        useImperativeHandle(ref, () => ({ open: reveal }));

        const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                const trimmed = title.trim();
                if (!trimmed) return;
                onSubmit(trimmed);
                setTitle('');
            } else if (e.key === 'Escape') {
                setTitle('');
                setIsEditing(false);
            }
        };

        const paddingLeft = 16 + indent * 20;

        if (!isEditing) {
            return (
                <tr>
                    <td
                        colSpan={colSpan}
                        className="border-b border-[var(--border-color)] px-3 py-2"
                        style={{ paddingLeft }}
                    >
                        <button
                            type="button"
                            onClick={reveal}
                            className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                        >
                            <Icon name="Plus" size={13} />
                            {label}
                        </button>
                    </td>
                </tr>
            );
        }

        return (
            <tr>
                <td
                    colSpan={colSpan}
                    className="border-b border-[var(--border-color)] px-3 py-2"
                    style={{ paddingLeft }}
                >
                    <input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            if (!title.trim()) setIsEditing(false);
                        }}
                        disabled={isSubmitting}
                        placeholder="Issue title, press Enter to create"
                        className="w-full max-w-md rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1 text-xs text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] disabled:opacity-60"
                    />
                </td>
            </tr>
        );
    },
);

QuickAddIssueRow.displayName = 'QuickAddIssueRow';

export default QuickAddIssueRow;
