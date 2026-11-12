import { motion } from 'framer-motion';
import type { icons } from 'lucide-react';
import React, { createContext, useContext, useId } from 'react';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { useSettingsPanelState } from '@/context/SettingsSectionsContext';
import { CollapsibleProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { riseIn, rowsParent } from '@/utils/motion';

/**
 * Panels rise into place with their siblings. A screen that already animates
 * its own sections (the Developer Portal) turns that off for the panels inside,
 * so they do not rise twice.
 */
export const PanelRiseContext = createContext(true);

interface SettingsPanelProps extends CollapsibleProps {
    title: string;
    description?: string;
    icon?: keyof typeof icons;
    /**
     * Makes the panel collapsible inside a settings page: its folded state is
     * remembered per browser and joins the page's Collapse all. Unique within
     * the tab. Ignored where the parent controls collapsing itself
     * (`onToggleCollapse`) or outside a settings page.
     */
    id?: string;
    /** First-visit state for a panel with an `id`. */
    defaultCollapsed?: boolean;
    children: React.ReactNode;
}

/**
 * A titled card of settings rows. Inside a settings page it rises into place
 * with its siblings (the page staggers them) and, given an `id`, folds from
 * its header.
 */
export default function SettingsPanel({
    title,
    description,
    icon,
    id,
    defaultCollapsed = false,
    children,
    collapsed: controlledCollapsed = false,
    onToggleCollapse,
    collapsedSummary,
}: SettingsPanelProps) {
    const bodyId = useId();
    const rise = useContext(PanelRiseContext);
    const remembered = useSettingsPanelState(
        onToggleCollapse ? undefined : id,
        defaultCollapsed,
    );

    const collapsed = remembered?.collapsed ?? controlledCollapsed;
    const toggle = onToggleCollapse ?? remembered?.toggle;

    return (
        <motion.section
            variants={rise ? riseIn : undefined}
            className="overflow-hidden rounded-2xl border border-(--border-color) bg-(--surface-color) backdrop-blur-xs"
        >
            <header
                className={cn(
                    'px-5 py-4',
                    !collapsed && 'border-b border-(--border-color)',
                )}
            >
                <CardHeader
                    icon={icon}
                    title={title}
                    description={description}
                    collapsed={collapsed}
                    onToggleCollapse={toggle}
                    collapsedSummary={collapsedSummary}
                    controls={bodyId}
                />
            </header>
            <Collapse id={bodyId} open={!collapsed}>
                <motion.div
                    variants={rowsParent}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-(--border-color)"
                >
                    {children}
                </motion.div>
            </Collapse>
        </motion.section>
    );
}
