import Badge from '@/Components/Atoms/Badge/Badge';
import { KeybindProps } from '@/types/Components';

function Keybind({ tooltipText, keybind, tooltip = true }: KeybindProps) {
    return (
        <Badge tooltip={tooltip} tooltipText={tooltipText} variant={'ghost'}>
            <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[var(--border-color)] bg-[var(--bg-light-color)] px-1.5 font-mono text-[9px] font-bold text-[var(--text-muted-color)] shadow-sm group-hover:border-[var(--border-color-strong)] group-hover:text-[var(--text-color)]">
                {keybind}
            </kbd>
        </Badge>
    );
}

export default Keybind;
