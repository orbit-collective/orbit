import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

interface ColorPickerProps {
    /** The current color, a 6-digit hex like `#2196f3`. */
    value: string;
    onChange: (color: string) => void;
    /** The quick colors: a scrolling row of dots that opens up into a grid. */
    palette: readonly string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const RAINBOW =
    'conic-gradient(from 90deg, #ff3b30, #ff9500, #ffcc00, #34c759, #00c7be, #0a84ff, #bf5af2, #ff3b30)';

const normalize = (color: string) => color.toLowerCase();

/**
 * One color control for the whole app. Closed, it is a single line: dots to
 * scroll through and a rainbow tile at the end. The tile opens it up - the dots
 * become a grid of rounded tiles and a full picker (saturation, hue and a hex
 * field) appears underneath, for any color the palette lacks.
 */
export default function ColorPicker({
    value,
    onChange,
    palette,
}: ColorPickerProps) {
    const [expanded, setExpanded] = useState(false);
    const [draft, setDraft] = useState(value);

    const current = HEX.test(value) ? normalize(value) : '#000000';
    // A color outside the palette still needs a swatch to show it is selected.
    const swatches = palette.includes(current)
        ? [...palette]
        : [current, ...palette];

    // Keep the hex field in step with picks made anywhere else.
    useEffect(() => setDraft(value), [value]);

    // The row scrolls, so the selected dot is brought to its middle rather
    // than left hidden off to one side. Only the row itself moves, never the page.
    const scroller = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const row = scroller.current;
        const selected = row?.querySelector<HTMLElement>(
            '[aria-pressed="true"]',
        );

        if (row && selected) {
            row.scrollLeft =
                selected.offsetLeft -
                row.clientWidth / 2 +
                selected.offsetWidth / 2;
        }
    }, [current, expanded]);

    const handleDraft = (next: string) => {
        setDraft(next);
        const withHash = next.startsWith('#') ? next : `#${next}`;

        if (HEX.test(withHash)) onChange(normalize(withHash));
    };

    const swatch = (color: string) => {
        const selected = current === color;

        return (
            <button
                key={color}
                type="button"
                data-nav
                onClick={() => onChange(color)}
                aria-label={`Use color ${color}`}
                aria-pressed={selected}
                title={color}
                className={cn(
                    'relative shrink-0 cursor-pointer border-2 border-solid transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                    expanded ? 'h-6 w-full rounded-md' : 'h-6 w-6 rounded-full',
                    selected
                        ? 'border-white'
                        : 'border-transparent hover:scale-110',
                )}
                style={{ backgroundColor: color }}
            >
                {selected && expanded && (
                    <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
                )}
            </button>
        );
    };

    const toggle = (
        <button
            type="button"
            data-nav
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Fewer colors' : 'More colors'}
            title={expanded ? 'Fewer colors' : 'More colors'}
            className={cn(
                'flex shrink-0 cursor-pointer items-center justify-center border-0 text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                expanded ? 'h-6 w-full rounded-md' : 'h-6 w-6 rounded-full',
            )}
            style={{ background: RAINBOW }}
        >
            <Icon name={expanded ? 'Minus' : 'Plus'} size={13} />
        </button>
    );

    return (
        <div className="space-y-3">
            {expanded ? (
                <div className="grid grid-cols-10 gap-1.5">
                    {swatches.map(swatch)}
                    {toggle}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <div
                        ref={scroller}
                        className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-0.5 py-1 [mask-image:linear-gradient(to_right,transparent,#000_10px,#000_calc(100%-14px),transparent)]"
                    >
                        {swatches.map(swatch)}
                    </div>
                    {toggle}
                </div>
            )}

            {expanded && (
                <div className="space-y-3">
                    <HexColorPicker
                        color={current}
                        onChange={(next) => onChange(normalize(next))}
                        className="orbit-colorful"
                    />
                    <div className="flex items-center gap-2">
                        <span
                            className="h-8 w-8 shrink-0 rounded-lg border border-solid border-[var(--border-color-strong)]"
                            style={{ backgroundColor: current }}
                        />
                        <input
                            value={draft}
                            onChange={(e) => handleDraft(e.target.value)}
                            onBlur={() => setDraft(value)}
                            aria-label="Hex color"
                            spellCheck={false}
                            autoComplete="off"
                            maxLength={7}
                            className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-[var(--bg-light-color)] px-3 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--text-color)] outline-none ring-0 transition-colors placeholder:text-[var(--text-muted-color)] focus:bg-[var(--bg-light-color-hover)] focus:ring-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
