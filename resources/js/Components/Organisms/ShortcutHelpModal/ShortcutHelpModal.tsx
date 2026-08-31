import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { useModal } from '@/context/ModalContext';
import { useShortcuts } from '@/context/ShortcutContext';
import { cn } from '@/utils/cn';
import {
    ArrowDown,
    ArrowUp,
    Command,
    Compass,
    CornerDownLeft,
    Eye,
    type LucideIcon,
    Plus,
    Search,
    Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    Action: Zap,
    Creation: Plus,
    Navigation: Compass,
    Search,
    View: Eye,
};

export const ShortcutHelpModal: React.FC = () => {
    const { shortcuts } = useShortcuts();
    const { closeAllModals } = useModal();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    const filteredShortcuts = useMemo(() => {
        if (!search.trim()) return shortcuts;
        const query = search.toLowerCase();
        return shortcuts.filter(
            (s) =>
                s.description.toLowerCase().includes(query) ||
                s.key.toLowerCase().includes(query) ||
                s.category?.toLowerCase().includes(query),
        );
    }, [shortcuts, search]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) =>
                Math.min(prev + 1, filteredShortcuts.length - 1),
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = filteredShortcuts[selectedIndex];
            if (selected) {
                selected.action();
                closeAllModals();
            }
        }
    };

    const categories = useMemo(() => {
        return filteredShortcuts.reduce(
            (acc, s) => {
                const category = s.category || 'Other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(s);
                return acc;
            },
            {} as Record<string, typeof shortcuts>,
        );
    }, [filteredShortcuts]);

    return (
        <div className="animate-in fade-in zoom-in shortcut-modal-marker flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--bg-color)] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] duration-200">
            <div className="flex items-center gap-3 bg-[var(--bg-dark-color)] px-4 py-4">
                <Search size={18} className="text-[var(--text-muted-color)]" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search shortcuts..."
                    className="flex-1 border-none bg-transparent text-[14px] text-[var(--text-color)] placeholder-[var(--text-muted-color)] outline-none focus:ring-0"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <span className="hidden shrink-0 items-center gap-1 rounded-md bg-[var(--bg-light-color)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted-color)] sm:flex">
                    <CornerDownLeft size={11} />
                    RETURN
                </span>
            </div>
            <div
                ref={scrollContainerRef}
                className="max-h-[450px] flex-1 overflow-y-auto p-1.5 [&::-webkit-scrollbar-thumb:hover]:bg-[var(--border-color-strong)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--bg-light-color-hover)] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5"
            >
                {Object.keys(categories).length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--text-muted-color)]">
                        No shortcuts found for "{search}"
                    </div>
                ) : (
                    Object.entries(categories).map(([category, items]) => {
                        const CategoryIcon =
                            CATEGORY_ICONS[category] ?? Command;

                        return (
                            <div key={category} className="mb-2 last:mb-0">
                                <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted-color)]">
                                    {category}
                                </h3>
                                <div className="space-y-0.5">
                                    {items.map((s, idx) => {
                                        const globalIndex =
                                            filteredShortcuts.indexOf(s);
                                        const isSelected =
                                            globalIndex === selectedIndex;

                                        return (
                                            <div
                                                key={idx}
                                                ref={
                                                    isSelected
                                                        ? selectedRef
                                                        : null
                                                }
                                                className={cn(
                                                    'group flex cursor-default items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
                                                    isSelected
                                                        ? 'bg-[var(--bg-light-color-hover)]'
                                                        : 'hover:bg-[var(--bg-light-color)]',
                                                )}
                                            >
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-light-color)] text-[var(--text-muted-color)]">
                                                    <CategoryIcon size={14} />
                                                </span>
                                                <span
                                                    className={cn(
                                                        'flex-1 truncate text-[13px] text-[var(--text-gray-color)] transition-colors',
                                                        isSelected
                                                            ? 'text-[var(--text-color)]'
                                                            : 'group-hover:text-[var(--text-color)]',
                                                    )}
                                                >
                                                    {s.description}
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {s.key.includes('+') ? (
                                                        <div className="flex items-center gap-1">
                                                            {s.key
                                                                .toLowerCase()
                                                                .split('+')
                                                                .map(
                                                                    (
                                                                        kPart,
                                                                        kIdx,
                                                                    ) => (
                                                                        <React.Fragment
                                                                            key={
                                                                                kIdx
                                                                            }
                                                                        >
                                                                            {kIdx >
                                                                                0 && (
                                                                                <span className="text-[10px] text-[var(--text-muted-color)]">
                                                                                    +
                                                                                </span>
                                                                            )}
                                                                            <Keybind
                                                                                tooltipText={
                                                                                    s.description
                                                                                }
                                                                                tooltip={
                                                                                    false
                                                                                }
                                                                                keybind={
                                                                                    kPart ===
                                                                                        'control' ||
                                                                                    kPart ===
                                                                                        'ctrl'
                                                                                        ? 'CTRL'
                                                                                        : kPart.toUpperCase()
                                                                                }
                                                                            />
                                                                        </React.Fragment>
                                                                    ),
                                                                )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            {s.key
                                                                .toLowerCase()
                                                                .split(/\s+/)
                                                                .map(
                                                                    (
                                                                        part,
                                                                        pIdx,
                                                                    ) => (
                                                                        <React.Fragment
                                                                            key={
                                                                                pIdx
                                                                            }
                                                                        >
                                                                            {pIdx >
                                                                                0 && (
                                                                                <span className="text-[9px] font-medium text-[var(--text-muted-color)]">
                                                                                    then
                                                                                </span>
                                                                            )}
                                                                            <Keybind
                                                                                tooltipText={`Press ${part.toUpperCase()}`}
                                                                                keybind={part.toUpperCase()}
                                                                            />
                                                                        </React.Fragment>
                                                                    ),
                                                                )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <div className="flex items-center gap-6 bg-[var(--bg-dark-color)] px-4 py-2.5">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted-color)]">
                    <Keybind tooltipText={'Press ESC'} keybind={'ESC'} />
                    <span>close</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted-color)]">
                    <div className="flex gap-1">
                        <kbd className="rounded-md bg-[var(--bg-light-color)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted-color)]">
                            <ArrowUp size={10} />
                        </kbd>
                        <kbd className="rounded-md bg-[var(--bg-light-color)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted-color)]">
                            <ArrowDown size={10} />
                        </kbd>
                    </div>
                    <span>navigate</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted-color)]">
                    <kbd className="rounded-md bg-[var(--bg-light-color)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted-color)]">
                        <CornerDownLeft size={10} />
                    </kbd>
                    <span>open</span>
                </div>
            </div>
        </div>
    );
};
