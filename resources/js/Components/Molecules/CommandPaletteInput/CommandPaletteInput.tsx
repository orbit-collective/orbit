import { ChevronRight, Search } from 'lucide-react';
import { forwardRef, KeyboardEvent } from 'react';

interface CommandPaletteInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    placeholder: string;
    listboxId: string;
    activeDescendantId?: string;
    /** Titles of the nested steps above the root list, e.g. `['#12', 'Change status']`. */
    breadcrumb?: string[];
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
            activeDescendantId,
            breadcrumb = [],
        },
        ref,
    ) => (
        <div className="flex h-[52px] items-center gap-3 border-b border-[var(--border-color)] px-4">
            <Search
                size={18}
                aria-hidden="true"
                className="shrink-0 text-[var(--text-muted-color)]"
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
                                    className="text-[var(--text-muted-color)]"
                                />
                            )}
                            <span>{title}</span>
                        </li>
                    ))}
                    <ChevronRight
                        size={12}
                        aria-hidden="true"
                        className="text-[var(--text-muted-color)]"
                    />
                </ol>
            )}
            <input
                ref={ref}
                type="text"
                role="combobox"
                aria-label="Search commands"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendantId}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-[var(--text-color)] placeholder-[var(--text-muted-color)] outline-none focus:ring-0"
            />
        </div>
    ),
);

CommandPaletteInput.displayName = 'CommandPaletteInput';

export default CommandPaletteInput;
