import Badge from '@/Components/Atoms/Badge/Badge';
import { KeybindProps } from '@/types/Components';
import { cn } from '@/utils/cn';

function Keybind({
    tooltipText,
    keybind,
    tooltip = true,
    surface = 'default',
}: KeybindProps) {
    return (
        <Badge tooltip={tooltip} tooltipText={tooltipText} variant={'ghost'}>
            <kbd
                className={cn(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-(--border-color) px-1.5 font-mono text-[9px] font-bold text-(--text-gray-color) shadow-xs group-hover:border-(--border-color-strong) group-hover:text-(--text-color)',
                    // `solid` keeps AA contrast when the chip sits on a
                    // tinted row (hover/active) instead of the page.
                    surface === 'solid'
                        ? 'bg-(--bg-color)'
                        : 'bg-(--bg-light-color)',
                )}
            >
                {keybind}
            </kbd>
        </Badge>
    );
}

export default Keybind;
