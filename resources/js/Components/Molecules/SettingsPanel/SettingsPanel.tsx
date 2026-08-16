import Icon from '@/Components/Atoms/Icon/Icon';
import { icons } from 'lucide-react';
import React from 'react';

interface SettingsPanelProps {
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
}: SettingsPanelProps) {
    return (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] backdrop-blur-sm">
            <header className="flex items-start gap-3 border-b border-[var(--border-color)] px-5 py-4">
                {icon && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name={icon} size={15} />
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-color)]">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                            {description}
                        </p>
                    )}
                </div>
            </header>
            <div className="divide-y divide-[var(--border-color)]">
                {children}
            </div>
        </section>
    );
}
