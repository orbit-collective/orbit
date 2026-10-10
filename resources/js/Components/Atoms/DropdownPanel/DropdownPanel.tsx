import { cn } from '@/utils/cn';
import { forwardRef, HTMLAttributes } from 'react';

/**
 * The floating surface every dropdown shares: a soft dark background with
 * rounded corners and a shadow, deliberately without a border. Positioning
 * (portal, fixed coordinates) is up to the caller — see `Dropdown`.
 */
const DropdownPanel = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(function DropdownPanel({ className, children, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn(
                'animate-in fade-in zoom-in-95 flex flex-col overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md duration-100 motion-reduce:animate-none',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
});

export default DropdownPanel;
