import {
    AnimatePresence,
    LayoutGroup,
    MotionConfig,
    motion,
} from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
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

/** Round dots are 24px, so a 12px radius is a circle; tiles are softly squared. */
const DOT_RADIUS = 12;
const TILE_RADIUS = 6;

const SPRING = { type: 'spring', stiffness: 520, damping: 38 } as const;

const normalize = (color: string) => color.toLowerCase();

/**
 * One color control for the whole app. Closed, it is a single line: dots to
 * scroll through and a rainbow tile at the end. The tile opens it up - the dots
 * glide into a grid of rounded tiles, the picker unfolds underneath (saturation,
 * hue and a hex field) for any color the palette lacks, and a ring follows
 * whichever color is selected. Motion is skipped for people who ask for less.
 */
export default function ColorPicker({
    value,
    onChange,
    palette,
}: ColorPickerProps) {
    const [expanded, setExpanded] = useState(false);
    const [draft, setDraft] = useState(value);
    const groupId = useId();

    const current = HEX.test(value) ? normalize(value) : '#000000';
    // A color outside the palette still needs a swatch to show it is selected.
    const swatches = palette.includes(current)
        ? [...palette]
        : [current, ...palette];

    // Keep the hex field in step with picks made anywhere else.
    useEffect(() => setDraft(value), [value]);

    // The row scrolls, so the selected dot is eased to its middle rather than
    // left hidden off to one side (the first time it just starts there). Only
    // the row itself moves, never the page.
    const scroller = useRef<HTMLDivElement>(null);
    const placed = useRef(false);
    useEffect(() => {
        const row = scroller.current;
        const selected = row?.querySelector<HTMLElement>(
            '[aria-pressed="true"]',
        );

        if (!row || !selected) return;

        const left =
            selected.offsetLeft -
            row.clientWidth / 2 +
            selected.offsetWidth / 2;

        if (typeof row.scrollTo === 'function') {
            row.scrollTo({
                left,
                behavior: placed.current ? 'smooth' : 'auto',
            });
        } else {
            row.scrollLeft = left;
        }
        placed.current = true;
    }, [current, expanded]);

    const handleDraft = (next: string) => {
        setDraft(next);
        const withHash = next.startsWith('#') ? next : `#${next}`;

        if (HEX.test(withHash)) onChange(normalize(withHash));
    };

    const radius = expanded ? TILE_RADIUS : DOT_RADIUS;

    const swatch = (color: string) => {
        const selected = current === color;

        return (
            <motion.button
                key={color}
                layoutId={color}
                type="button"
                data-nav
                onClick={() => onChange(color)}
                aria-label={`Use color ${color}`}
                aria-pressed={selected}
                title={color}
                whileHover={{ scale: 1.14 }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING}
                animate={{ borderRadius: radius }}
                initial={false}
                className={cn(
                    'relative shrink-0 cursor-pointer border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                    expanded ? 'h-6 w-full' : 'h-6 w-6',
                )}
                style={{ backgroundColor: color, borderRadius: radius }}
            >
                {selected && (
                    <motion.span
                        layoutId="ring"
                        transition={SPRING}
                        className="pointer-events-none absolute -inset-[3px] border-2 border-solid border-white"
                        style={{ borderRadius: radius + 3 }}
                    />
                )}
                <AnimatePresence initial={false}>
                    {selected && expanded && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={SPRING}
                            className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-white/90 shadow"
                        />
                    )}
                </AnimatePresence>
            </motion.button>
        );
    };

    const toggle = (
        <motion.button
            layoutId="toggle"
            type="button"
            data-nav
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Fewer colors' : 'More colors'}
            title={expanded ? 'Fewer colors' : 'More colors'}
            whileHover={{ scale: 1.14 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            animate={{ borderRadius: radius }}
            initial={false}
            className={cn(
                'flex shrink-0 cursor-pointer items-center justify-center border-0 p-0 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                expanded ? 'h-6 w-full' : 'h-6 w-6',
            )}
            style={{ background: RAINBOW, borderRadius: radius }}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={expanded ? 'minus' : 'plus'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="flex"
                >
                    <Icon name={expanded ? 'Minus' : 'Plus'} size={13} />
                </motion.span>
            </AnimatePresence>
        </motion.button>
    );

    return (
        <MotionConfig reducedMotion="user">
            <LayoutGroup id={groupId}>
                {/* Clipped so dots gliding in from the scrolled-off part of the row stay inside. */}
                <div className="overflow-hidden">
                    {expanded ? (
                        <div className="grid grid-cols-10 gap-1.5 px-1 py-1">
                            {swatches.map(swatch)}
                            {toggle}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div
                                ref={scroller}
                                className="no-scrollbar relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1.5 py-1.5 [mask-image:linear-gradient(to_right,transparent,#000_10px,#000_calc(100%-14px),transparent)]"
                            >
                                {swatches.map(swatch)}
                            </div>
                            {toggle}
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {expanded && (
                            <motion.div
                                key="picker"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                    height: SPRING,
                                    opacity: { duration: 0.18 },
                                }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3 px-1 pb-1 pt-3">
                                    <HexColorPicker
                                        color={current}
                                        onChange={(next) =>
                                            onChange(normalize(next))
                                        }
                                        className="orbit-colorful"
                                    />
                                    <div className="flex items-center gap-2">
                                        <motion.span
                                            className="h-8 w-8 shrink-0 rounded-lg border border-solid border-[var(--border-color-strong)]"
                                            animate={{
                                                backgroundColor: current,
                                            }}
                                            transition={{ duration: 0.2 }}
                                        />
                                        <input
                                            value={draft}
                                            onChange={(e) =>
                                                handleDraft(e.target.value)
                                            }
                                            onBlur={() => setDraft(value)}
                                            aria-label="Hex color"
                                            spellCheck={false}
                                            autoComplete="off"
                                            maxLength={7}
                                            className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-[var(--bg-light-color)] px-3 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--text-color)] outline-none ring-0 transition-colors placeholder:text-[var(--text-muted-color)] focus:bg-[var(--bg-light-color-hover)] focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </LayoutGroup>
        </MotionConfig>
    );
}
