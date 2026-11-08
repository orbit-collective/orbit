import { motion } from 'framer-motion';
import { CSSProperties, FC } from 'react';
import WidgetGlyph from '@/Components/Atoms/WidgetGlyph/WidgetGlyph';
import { useElementWidth } from '@/hooks/useElementWidth';
import { DashboardWidget } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';

interface LayoutPreviewProps {
    widgets: DashboardWidget[];
    className?: string;
}

/** What the preview's width is until it is measured. */
const FALLBACK_WIDTH = 240;

/** The padding and border of the frame, which the blocks do not have. */
const FRAME = 14;

/**
 * A small picture of a layout: a block per visible widget on the same grid as
 * the dashboard, so its proportions are the real ones. A row is 4px on a
 * dashboard about 1200px wide, which is 1/300 of the preview's width. The
 * width is measured and handed down as `--u`, one hundredth of it, which the
 * drawings of the widgets size themselves by (a stylesheet without container
 * queries cannot do that).
 */
const LayoutPreview: FC<LayoutPreviewProps> = ({ widgets, className }) => {
    const visible = widgets.filter((widget) => widget.visible);
    const [ref, width] = useElementWidth<HTMLDivElement>();
    const unit = Math.max((width || FALLBACK_WIDTH) - FRAME, 0) / 100;

    return (
        <motion.div
            ref={ref}
            aria-hidden="true"
            data-testid="layout-preview"
            // The picture leans towards the pointer.
            whileHover={{ scale: 1.015 }}
            transition={SPRING}
            className={cn(
                'relative max-h-44 overflow-hidden rounded-lg border border-solid border-[var(--border-color)] bg-[var(--bg-color)] p-1.5',
                className,
            )}
        >
            {visible.length === 0 ? (
                <div className="flex h-12 items-center justify-center text-[10px] text-[var(--text-muted-color)]">
                    Empty
                </div>
            ) : (
                <div
                    data-testid="layout-preview-grid"
                    className="grid grid-cols-[repeat(120,minmax(0,1fr))] [grid-auto-flow:dense]"
                    style={
                        {
                            '--u': `${unit}px`,
                            gridAutoRows: `${unit / 3}px`,
                        } as CSSProperties
                    }
                >
                    {visible.map((widget, index) => (
                        <motion.div
                            key={widget.id}
                            data-testid="layout-preview-block"
                            className="min-h-0 min-w-0 overflow-hidden p-px"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE,
                                delay: rowDelay(index),
                            }}
                            style={{
                                gridColumn: `span ${widget.width}`,
                                gridRow: `span ${widget.height}`,
                            }}
                        >
                            <WidgetGlyph widget={widget} />
                        </motion.div>
                    ))}
                </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--bg-color)] to-transparent" />
        </motion.div>
    );
};

export default LayoutPreview;
