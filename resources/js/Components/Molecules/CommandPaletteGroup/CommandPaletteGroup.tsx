import { ReactNode } from 'react';

interface CommandPaletteGroupProps {
    /** Unique within the palette; ties the heading to its group for screen readers. */
    id: string;
    label: string;
    children: ReactNode;
}

function CommandPaletteGroup({
    id,
    label,
    children,
}: CommandPaletteGroupProps) {
    return (
        <div role="group" aria-labelledby={id} className="mb-1 last:mb-0">
            <div
                id={id}
                className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted-color)]"
            >
                {label}
            </div>
            {children}
        </div>
    );
}

export default CommandPaletteGroup;
