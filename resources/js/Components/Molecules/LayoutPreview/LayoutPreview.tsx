import { motion } from 'framer-motion';
import { FC } from 'react';
import { DashboardWidget } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { DURATION, EASE, rowDelay } from '@/utils/motion';

interface LayoutPreviewProps {
    widgets: DashboardWidget[];
    className?: string;
}

/**
 * A small picture of a layout: a block per visible widget on the same grid as
 * the dashboard, so its proportions are the real ones. A row is 4px on a
 * dashboard about 1200px wide, which is 1/300 of the preview's width.
 */
const LayoutPreview: FC<LayoutPreviewProps> = ({ widgets, className }) => {
    const visible = widgets.filter((widget) => widget.visible);

    return (
        <div
            aria-hidden="true"
            data-testid="layout-preview"
            className={cn(
                '@container relative max-h-32 overflow-hidden rounded-lg border border-solid border-[var(--border-color)] bg-[var(--bg-color)] p-1.5',
                className,
            )}
        >
            {visible.length === 0 ? (
                <div className="flex h-12 items-center justify-center text-[10px] text-[var(--text-muted-color)]">
                    Empty
                </div>
            ) : (
                <div className="grid auto-rows-[calc(100cqw/300)] grid-cols-[repeat(120,minmax(0,1fr))] [grid-auto-flow:dense]">
                    {visible.map((widget, index) => (
                        <motion.div
                            key={widget.id}
                            data-testid="layout-preview-block"
                            className="p-px"
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
                            <div className="h-full w-full rounded-[3px] border border-solid border-[var(--border-color-strong)] bg-[var(--bg-light-color)]" />
                        </motion.div>
                    ))}
                </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--bg-color)] to-transparent" />
        </div>
    );
};

export default LayoutPreview;
