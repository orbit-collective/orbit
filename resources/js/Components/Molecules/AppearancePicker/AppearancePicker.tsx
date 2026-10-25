import { icons } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import ColorPicker from '@/Components/Molecules/ColorPicker/ColorPicker';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { cn } from '@/utils/cn';

interface AppearancePickerProps {
    color: string;
    onColorChange: (color: string) => void;
    palette: readonly string[];
    /** With both, the panel also offers an icon grid under the colors. */
    icon?: string;
    onIconChange?: (icon: string) => void;
    iconOptions?: readonly (keyof typeof icons)[];
    /** What the user clicks: the thing being styled, drawn in its current look. */
    children: ReactNode;
    ariaLabel: string;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * One small popover for "how does this look": a grid of colors with a custom
 * picker at its end and, when icons are offered, a grid of icons below. The
 * trigger is the thing itself, so the look is its own live preview.
 */
export default function AppearancePicker({
    color,
    onColorChange,
    palette,
    icon,
    onIconChange,
    iconOptions,
    children,
    ariaLabel,
}: AppearancePickerProps) {
    const offersIcons = Boolean(onIconChange && iconOptions?.length);

    return (
        <Dropdown
            variant="panel"
            ariaLabel={ariaLabel}
            width={296}
            align="start"
            trigger={
                <button
                    type="button"
                    aria-label={ariaLabel}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent transition-[background-color,border-color,transform] duration-200 hover:border-[var(--border-color-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] active:scale-95"
                    style={{
                        backgroundColor: HEX_COLOR.test(color)
                            ? `${color}1f`
                            : undefined,
                    }}
                >
                    {children}
                </button>
            }
            panelClassName="max-w-[calc(100vw-1rem)] slide-in-from-top-1 max-h-[min(34rem,80vh)] duration-200 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark-color)] p-3 shadow-2xl"
        >
            <div className="space-y-3">
                <ColorPicker
                    value={color}
                    onChange={onColorChange}
                    palette={palette}
                />

                {offersIcons && (
                    <div className="grid grid-cols-8 gap-1 border-t border-[var(--border-color)] pt-3">
                        {iconOptions!.map((option) => (
                            <button
                                key={option}
                                type="button"
                                data-nav
                                onClick={() => onIconChange!(option)}
                                aria-label={`Use icon ${option}`}
                                aria-pressed={icon === option}
                                className={cn(
                                    'flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center touch-manipulation rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                                    icon === option
                                        ? 'bg-[var(--bg-light-color-hover)] text-[var(--text-color)]'
                                        : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                                )}
                            >
                                <Icon name={option} size={15} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Dropdown>
    );
}
