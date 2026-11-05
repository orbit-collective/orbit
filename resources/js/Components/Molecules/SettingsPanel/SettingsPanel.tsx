import { motion } from 'framer-motion';
import { icons } from 'lucide-react';
import React, { useId } from 'react';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { useSettingsPanelState } from '@/context/SettingsSectionsContext';
import { CollapsibleProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { riseIn } from '@/utils/motion';

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
    const remembered = useSettingsPanelState(
        onToggleCollapse ? undefined : id,
        defaultCollapsed,
    );

    const collapsed = remembered?.collapsed ?? controlledCollapsed;
    const toggle = onToggleCollapse ?? remembered?.toggle;

    return (
        <motion.section
            variants={riseIn}
            className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] backdrop-blur-sm"
        >
            <header
                className={cn(
                    'px-5 py-4',
                    !collapsed && 'border-b border-[var(--border-color)]',
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
                <div className="divide-y divide-[var(--border-color)]">
                    {children}
                </div>
            </Collapse>
        </motion.section>
    );
}
