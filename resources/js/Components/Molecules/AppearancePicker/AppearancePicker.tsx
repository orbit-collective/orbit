import { icons } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
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
            width={280}
            align="start"
            trigger={
                <button
                    type="button"
                    aria-label={ariaLabel}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent transition-all hover:border-[var(--border-color-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    style={{
                        backgroundColor: HEX_COLOR.test(color)
                            ? `${color}1f`
                            : undefined,
                    }}
                >
                    {children}
                </button>
            }
            panelClassName="rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark-color)] p-3 shadow-2xl"
        >
            <div className="space-y-3">
                <div className="grid grid-cols-10 gap-1.5">
                    {palette.map((swatch) => (
                        <button
                            key={swatch}
                            type="button"
                            data-nav
                            onClick={() => onColorChange(swatch)}
                            aria-label={`Use color ${swatch}`}
                            aria-pressed={color.toLowerCase() === swatch}
                            className={cn(
                                'h-[22px] w-[22px] cursor-pointer justify-self-center rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                                color.toLowerCase() === swatch
                                    ? 'scale-110 border-white'
                                    : 'border-transparent hover:scale-110',
                            )}
                            style={{ backgroundColor: swatch }}
                        />
                    ))}
                    <label
                        className="relative flex h-[22px] w-[22px] cursor-pointer items-center justify-center justify-self-center rounded-full border border-dashed border-[var(--border-color-strong)] text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)]"
                        title="Custom color"
                    >
                        <Icon name="Plus" size={12} />
                        <input
                            type="color"
                            value={HEX_COLOR.test(color) ? color : '#000000'}
                            onChange={(e) => onColorChange(e.target.value)}
                            aria-label="Pick a custom color"
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                    </label>
                </div>

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
                                    'flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
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
