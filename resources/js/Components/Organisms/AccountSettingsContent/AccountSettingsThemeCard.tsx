import Icon from '@/Components/Atoms/Icon/Icon';
import { ThemeMode } from '@/types/Theme';

interface AccountSettingsThemeCardProps {
    id: ThemeMode;
    label: string;
    subtitle: string;
    selected: boolean;
    onSelect: () => void;
}

/**
 * These previews render a fixed snapshot of what each theme option looks
 * like, independent of the currently active theme — so every swatch is a
 * literal hex value rather than a CSS variable (which would just reflect
 * whatever theme is active right now, breaking the "Dark" preview while
 * viewing the page in light mode, and vice versa).
 *
 * The accent bars are the one exception: the accent color is chosen
 * separately (Settings > Preferences > Accent color) and applies the same
 * regardless of theme, so those bars use `var(--accent-color)` directly to
 * always reflect the user's current pick.
 */
const themePreviewStyles: Record<
    ThemeMode,
    {
        frame: string;
        canvas: string;
        sidebar: string;
        topbar: string;
        row: string;
    }
> = {
    dark: {
        frame: 'bg-[#08090a]',
        canvas: 'bg-[#101113]',
        sidebar: 'bg-[#050505]',
        topbar: 'bg-[#08090a]',
        row: 'bg-[rgba(255,255,255,0.08)]',
    },
    light: {
        frame: 'bg-[#f7f8fa]',
        canvas: 'bg-[#ffffff]',
        sidebar: 'bg-[#eef0f4]',
        topbar: 'bg-[#f7f8fa]',
        row: 'bg-[rgba(0,0,0,0.06)]',
    },
    system: {
        frame: 'bg-[#0d0e13]',
        canvas: 'bg-[#181a22]',
        sidebar: 'bg-[#12131a]',
        topbar: 'bg-[#0d0e13]',
        row: 'bg-[#33384a]',
    },
};

export default function AccountSettingsThemeCard({
    id,
    label,
    subtitle,
    selected,
    onSelect,
}: AccountSettingsThemeCardProps) {
    const palette = themePreviewStyles[id];

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--border-color-strong)]'
            }`}
        >
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--text-color)]">
                        {label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                        {subtitle}
                    </p>
                </div>
                <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected
                            ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                            : 'border-[var(--border-color-strong)] text-transparent'
                    }`}
                >
                    <Icon name="Check" size={11} />
                </span>
            </div>
            <div
                className={`flex h-[74px] gap-1 overflow-hidden rounded-lg border border-[var(--border-color)] p-1 ${palette.frame}`}
            >
                <div
                    className={`w-5 shrink-0 space-y-1 rounded-md p-1 ${palette.sidebar}`}
                >
                    <div className={`h-1 rounded-full ${palette.row}`} />
                    <div className={`h-1 rounded-full ${palette.row}`} />
                    <div className="h-1 rounded-full bg-[var(--accent-color)]" />
                </div>
                <div className="flex flex-1 flex-col gap-1 overflow-hidden rounded-md">
                    <div
                        className={`h-1.5 shrink-0 rounded-sm ${palette.topbar}`}
                    />
                    <div
                        className={`flex-1 space-y-1.5 rounded-sm p-1 ${palette.canvas}`}
                    >
                        <div className="h-1.5 w-2/3 rounded-full bg-[var(--accent-color)]" />
                        <div className={`h-1.5 rounded-full ${palette.row}`} />
                        <div
                            className={`h-1.5 w-4/5 rounded-full ${palette.row}`}
                        />
                    </div>
                </div>
            </div>
        </button>
    );
}
