import { icons } from 'lucide-react';
import React, { useId } from 'react';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import { CollapsibleProps } from '@/types/Components';

interface SettingsPanelProps extends CollapsibleProps {
    title: string;
    description?: string;
    icon?: keyof typeof icons;
    children: React.ReactNode;
}

export default function SettingsPanel({
    title,
    description,
    icon,
    children,
    collapsed = false,
    onToggleCollapse,
    collapsedSummary,
}: SettingsPanelProps) {
    const bodyId = useId();

    return (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] backdrop-blur-sm">
            {icon ? (
                <header
                    className={
                        collapsed
                            ? 'px-5 py-4'
                            : 'border-b border-[var(--border-color)] px-5 py-4'
                    }
                >
                    <CardHeader
                        icon={icon}
                        title={title}
                        description={description}
                        collapsed={collapsed}
                        onToggleCollapse={onToggleCollapse}
                        collapsedSummary={collapsedSummary}
                        controls={bodyId}
                    />
                </header>
            ) : (
                <header className="border-b border-[var(--border-color)] px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--text-color)]">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                            {description}
                        </p>
                    )}
                </header>
            )}
            <div
                id={bodyId}
                hidden={collapsed}
                className="divide-y divide-[var(--border-color)]"
            >
                {children}
            </div>
        </section>
    );
}
