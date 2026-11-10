import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { CollapseAllButtonProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE } from '@/utils/motion';

/**
 * "Collapse all" / "Expand all" for a page of foldable panels. The label and
 * icon swap with the shared motion timing.
 */
const CollapseAllButton: React.FC<CollapseAllButtonProps> = ({
    allCollapsed,
    onToggle,
}) => (
    <button
        type="button"
        onClick={onToggle}
        className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-(--text-gray-color) transition-colors duration-200 hover:bg-(--bg-light-color) hover:text-(--text-color)',
            FOCUS_RING,
        )}
    >
        <AnimatePresence mode="wait" initial={false}>
            <motion.span
                key={allCollapsed ? 'expand' : 'collapse'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DURATION.fast, ease: EASE }}
                className="flex items-center gap-1.5"
            >
                <Icon
                    name={allCollapsed ? 'ChevronsUpDown' : 'ChevronsDownUp'}
                    size={14}
                />
                {allCollapsed ? 'Expand all' : 'Collapse all'}
            </motion.span>
        </AnimatePresence>
    </button>
);

export default CollapseAllButton;
