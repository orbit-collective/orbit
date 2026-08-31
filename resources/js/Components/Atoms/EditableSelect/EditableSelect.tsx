import Icon from '@/Components/Atoms/Icon/Icon';
import { EditableSelectProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const SEARCH_THRESHOLD = 6;

const EditableSelect: React.FC<EditableSelectProps> = ({
    value,
    options,
    onSave,
    renderValue,
    header,
    disabled = false,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const showSearch = options.length > SEARCH_THRESHOLD;

    const filteredOptions = useMemo(() => {
        if (!showSearch || !search.trim()) return options;
        const query = search.trim().toLowerCase();
        return options.filter((option) =>
            (option.searchLabel ?? option.value).toLowerCase().includes(query),
        );
    }, [options, search, showSearch]);

    useEffect(() => {
        if (!isOpen) return;

        searchRef.current?.focus();

        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selected = options.find((option) => option.value === value);

    return (
        <div className={cn('relative w-fit', className)} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setSearch('');
                    setIsOpen((prev) => !prev);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-left transition-colors hover:bg-[var(--bg-light-color)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                {renderValue ? renderValue(value) : (selected?.label ?? value)}
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[100] w-64 overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md">
                    {header && (
                        <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                            {header}
                        </p>
                    )}

                    {showSearch && (
                        <div className="mt-2 flex items-center gap-2 px-3">
                            <Icon
                                name="Search"
                                size={14}
                                className="shrink-0 text-[var(--text-muted-color)]"
                            />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search…"
                                className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                            />
                        </div>
                    )}

                    <div className="max-h-64 space-y-0.5 overflow-y-auto p-1.5">
                        {filteredOptions.length === 0 ? (
                            <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                                <Icon
                                    name="SearchX"
                                    size={18}
                                    className="text-[var(--text-muted-color)]"
                                />
                                <p className="text-xs font-medium text-[var(--text-muted-color)]">
                                    No matches found
                                </p>
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            if (!isSelected) {
                                                onSave(option.value);
                                            }
                                        }}
                                        className={cn(
                                            'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-150',
                                            isSelected
                                                ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                                                : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                                                isSelected
                                                    ? 'bg-[var(--accent-color)]'
                                                    : 'bg-[var(--bg-light-color)]',
                                            )}
                                        >
                                            {isSelected && (
                                                <Icon
                                                    name="Check"
                                                    size={10}
                                                    className="text-white"
                                                />
                                            )}
                                        </div>
                                        {option.label}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditableSelect;
