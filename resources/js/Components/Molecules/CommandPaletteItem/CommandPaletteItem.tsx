import { Fragment, ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { Command } from '@/types/Commands';
import { cn } from '@/utils/cn';
import { MatchRange } from '@/utils/fuzzyScore';
import { formatBindingParts, toBindings } from '@/utils/shortcutKeys';

interface CommandPaletteItemProps {
    /** DOM id, referenced by the input's `aria-activedescendant`. */
    id: string;
    command: Command;
    ranges?: MatchRange[];
    active: boolean;
    onSelect: () => void;
    onHover: () => void;
}

const highlight = (title: string, ranges: MatchRange[]) => {
    if (ranges.length === 0) return title;

    const parts: ReactNode[] = [];
    let cursor = 0;

    ranges.forEach(([start, end], index) => {
        if (start > cursor) parts.push(title.slice(cursor, start));
        parts.push(
            <mark
                key={index}
                className="rounded-sm bg-[var(--accent-color-opacity)] font-semibold text-[var(--text-color)]"
            >
                {title.slice(start, end)}
            </mark>,
        );
        cursor = end;
    });

    if (cursor < title.length) parts.push(title.slice(cursor));

    return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
};

const shortcutParts = (shortcut: string | string[]): string[] => {
    const [primary] = toBindings(shortcut);

    return primary.includes('+') && primary !== '+'
        ? formatBindingParts(primary)
        : primary.split(/\s+/).map((part) => part.toUpperCase());
};

function CommandPaletteItem({
    id,
    command,
    ranges = [],
    active,
    onSelect,
    onHover,
}: CommandPaletteItemProps) {
    return (
        <div
            id={id}
            role="option"
            aria-selected={active}
            onClick={onSelect}
            onMouseMove={onHover}
            className={cn(
                'flex h-12 cursor-pointer items-center gap-3 rounded-lg px-3 transition-colors md:h-10',
                active
                    ? 'bg-[var(--bg-light-color-hover)]'
                    : 'hover:bg-[var(--bg-light-color)]',
            )}
        >
            <Icon
                name={command.icon}
                size={16}
                color={command.iconColor}
                className="shrink-0 text-[var(--text-gray-color)]"
            />
            {command.prefix && (
                <span className="shrink-0 font-mono text-[12px] text-[var(--text-gray-color)]">
                    {command.prefix}
                </span>
            )}
            <span className="min-w-0 truncate text-[14px] text-[var(--text-color)]">
                {highlight(command.title, ranges)}
            </span>
            {command.subtitle && (
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-gray-color)]">
                    {command.subtitle}
                </span>
            )}
            {!command.subtitle && <span className="flex-1" />}
            {command.shortcut && (
                <span className="flex shrink-0 items-center gap-1">
                    {shortcutParts(command.shortcut).map((part, index) => (
                        <Keybind
                            key={`${part}-${index}`}
                            tooltipText={command.title}
                            tooltip={false}
                            surface="solid"
                            keybind={part}
                        />
                    ))}
                </span>
            )}
            {command.children && (
                <Icon
                    name="ChevronRight"
                    size={14}
                    className="shrink-0 text-[var(--text-gray-color)]"
                />
            )}
        </div>
    );
}

export default CommandPaletteItem;
