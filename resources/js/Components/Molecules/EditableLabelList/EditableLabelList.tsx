import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import { EditableLabelListProps } from '@/types/Components';
import { IssueLabel } from '@/types/Issues';
import { cn } from '@/utils/cn';
import React, { useEffect, useRef, useState } from 'react';

const AVAILABLE_LABELS: IssueLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
];

const EditableLabelList: React.FC<EditableLabelListProps> = ({
    labels,
    onSave,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

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

    const toggleLabel = (label: IssueLabel) => {
        const next = labels.includes(label)
            ? labels.filter((l) => l !== label)
            : [...labels, label];
        onSave(next);
    };

    const filteredLabels = AVAILABLE_LABELS.filter((label) =>
        label.toLowerCase().includes(search.toLowerCase()),
    );

    const allSelected =
        AVAILABLE_LABELS.length > 0 &&
        AVAILABLE_LABELS.every((label) => labels.includes(label));

    const toggleSelectAll = () => {
        onSave(allSelected ? [] : [...AVAILABLE_LABELS]);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex flex-wrap items-center gap-1.5">
                {labels.length === 0 && (
                    <span className="text-sm text-[var(--text-gray-color)]">
                        None
                    </span>
                )}
                {labels.map((label) => (
                    <LabelBadge key={label} label={label} />
                ))}
                <button
                    type="button"
                    disabled={disabled}
                    aria-label="Edit labels"
                    onClick={() => {
                        setSearch('');
                        setIsOpen((prev) => !prev);
                    }}
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                    <Icon name="Plus" size={12} />
                </button>
            </div>
            {isOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[100] flex w-64 flex-col overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md">
                    <div className="flex shrink-0 items-center justify-between px-3 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                            Labels
                        </p>
                        {labels.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onSave([])}
                                className="cursor-pointer text-[10px] font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="mt-2 flex shrink-0 items-center gap-2 px-3">
                        <Icon
                            name="Search"
                            size={14}
                            className="shrink-0 text-[var(--text-muted-color)]"
                        />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Change or add labels..."
                            className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                        />
                    </div>

                    <p className="shrink-0 px-3 pb-1.5 pt-2 text-[11px] text-[var(--text-muted-color)]">
                        {filteredLabels.length}{' '}
                        {filteredLabels.length === 1 ? 'result' : 'results'}
                    </p>

                    <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
                        {filteredLabels.length === 0 ? (
                            <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                                <Icon
                                    name="SearchX"
                                    size={18}
                                    className="text-[var(--text-muted-color)]"
                                />
                                <p className="text-xs font-medium text-[var(--text-muted-color)]">
                                    No labels found.
                                </p>
                            </div>
                        ) : (
                            filteredLabels.map((label) => {
                                const isSelected = labels.includes(label);
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => toggleLabel(label)}
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
                                        <LabelBadge
                                            label={label}
                                            className="pointer-events-none"
                                        />
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {AVAILABLE_LABELS.length > 0 && (
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-xs text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)]"
                        >
                            <div
                                className={cn(
                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                                    allSelected
                                        ? 'bg-[var(--accent-color)]'
                                        : 'bg-[var(--bg-light-color)]',
                                )}
                            >
                                {allSelected && (
                                    <Icon
                                        name="Check"
                                        size={10}
                                        className="text-white"
                                    />
                                )}
                            </div>
                            <span className="font-medium">Select all</span>
                            <span className="ml-auto text-[var(--text-muted-color)]">
                                {AVAILABLE_LABELS.length}
                            </span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EditableLabelList;
