import React from 'react';

interface SettingsSidebarSectionProps {
    title: string;
    children: React.ReactNode;
}

export default function SettingsSidebarSection({
    title,
    children,
}: SettingsSidebarSectionProps) {
    return (
        <section className="space-y-1">
            <h2 className="px-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                {title}
            </h2>
            <div className="space-y-0.5">{children}</div>
        </section>
    );
}
