import { DropdownMenuProps } from '@/types/Components';
import { cn } from '@/utils/cn';

export default function DropdownMenu({
    children,
    direction = 'bottom',
    header,
    stretch = true,
}: DropdownMenuProps) {
    return (
        <div
            className={cn(
                'absolute left-0 z-[100] flex max-h-[320px] flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border-color-strong)] bg-[var(--bg-dark-color)] p-1.5 shadow-2xl backdrop-blur-md',
                stretch ? 'right-0' : 'w-max min-w-[180px]',
                direction === 'bottom'
                    ? 'top-[calc(100%+6px)]'
                    : 'bottom-[calc(100%+6px)]',
            )}
        >
            {header && (
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                    {header}
                </div>
            )}
            <div className="space-y-0.5">{children}</div>
        </div>
    );
}
