import { ChevronRight, Search } from 'lucide-react';
import { forwardRef, KeyboardEvent } from 'react';
import IconButton from '@/Components/Atoms/IconButton/IconButton';

interface CommandPaletteInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    placeholder: string;
    listboxId: string;
    /** Whether the listbox is shown; `aria-controls` only applies while it is. */
    expanded: boolean;
    activeDescendantId?: string;
    /** Titles of the nested steps above the root list, e.g. `['#12', 'Change status']`. */
    breadcrumb?: string[];
    /** Shows a close button below `md`, where there is no Esc key. */
    onClose?: () => void;
}

const CommandPaletteInput = forwardRef<
    HTMLInputElement,
    CommandPaletteInputProps
>(
    (
        {
            value,
            onChange,
            onKeyDown,
            placeholder,
            listboxId,
            expanded,
            activeDescendantId,
            breadcrumb = [],
            onClose,
        },
        ref,
    ) => (
        <div className="flex h-14 items-center gap-3 border-b border-[var(--border-color)] px-4 md:h-[52px]">
            <Search
                size={18}
                aria-hidden="true"
                className="shrink-0 text-[var(--text-gray-color)]"
            />
            {breadcrumb.length > 0 && (
                <ol
                    aria-label="Current step"
                    className="flex shrink-0 items-center gap-1 text-[13px] text-[var(--text-gray-color)]"
                >
                    {breadcrumb.map((title, index) => (
                        <li
                            key={`${title}-${index}`}
                            className="flex items-center gap-1"
                        >
                            {index > 0 && (
                                <ChevronRight
                                    size={12}
                                    aria-hidden="true"
                                    className="text-[var(--text-gray-color)]"
                                />
                            )}
                            <span>{title}</span>
                        </li>
                    ))}
                    <ChevronRight
                        size={12}
                        aria-hidden="true"
                        className="text-[var(--text-gray-color)]"
                    />
                </ol>
            )}
            <input
                ref={ref}
                type="text"
                role="combobox"
                aria-label="Search commands"
                aria-expanded={expanded}
                aria-controls={expanded ? listboxId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendantId}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                className="min-w-0 flex-1 border-none bg-transparent text-base text-[var(--text-color)] placeholder-[var(--text-gray-color)] outline-none focus:ring-0 md:text-[15px]"
            />
            {onClose && (
                // Touch has no Esc. Out of the Tab order: keyboard users already
                // have Esc, and a second tab stop would let Tab leave the dialog.
                <IconButton
                    type="button"
                    iconName="X"
                    iconSize={18}
                    ariaLabel="Close command palette"
                    tabIndex={-1}
                    onClick={onClose}
                    className="-mr-2 shrink-0 text-[var(--text-gray-color)] md:hidden"
                />
            )}
        </div>
    ),
);

CommandPaletteInput.displayName = 'CommandPaletteInput';

export default CommandPaletteInput;
