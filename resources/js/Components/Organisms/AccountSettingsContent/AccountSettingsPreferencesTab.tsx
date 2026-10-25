import { useState } from 'react';
import ColorPicker from '@/Components/Molecules/ColorPicker/ColorPicker';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import AccountSettingsIssueViewCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard';
import AccountSettingsThemeCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsThemeCard';
import { useAccent } from '@/context/AccentContext';
import { useTheme } from '@/context/ThemeContext';
import { IssuePageLooks } from '@/types/Issues';
import { ThemeMode } from '@/types/Theme';
import {
    ACCENT_PALETTE,
    accentFromHex,
    getAccentSwatch,
} from '@/utils/accentColors';

const issueViewOptions: Array<{
    id: IssuePageLooks;
    icon: 'Rows3' | 'Columns3' | 'CalendarDays' | 'Activity';
    description: string;
}> = [
    {
        id: 'List',
        icon: 'Rows3',
        description: 'A dense, sortable table of every issue.',
    },
    {
        id: 'Board',
        icon: 'Columns3',
        description: 'Kanban columns grouped by status or priority.',
    },
    {
        id: 'Calendar',
        icon: 'CalendarDays',
        description: 'Issues plotted against their due dates.',
    },
    {
        id: 'Activity',
        icon: 'Activity',
        description: 'A chronological feed of all issue activity.',
    },
];

const themeOptions: Array<{ id: ThemeMode; label: string; subtitle: string }> =
    [
        { id: 'dark', label: 'Dark', subtitle: 'Orbit dark interface' },
        { id: 'light', label: 'Light', subtitle: 'Light workspace mode' },
        {
            id: 'system',
            label: 'System sync',
            subtitle: 'Follow OS preference',
        },
    ];

export default function AccountSettingsPreferencesTab() {
    const { theme, setTheme } = useTheme();
    const { accentColor, setAccentColor } = useAccent();

    const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
        const saved = localStorage.getItem('selectedLook');
        if (
            saved === 'List' ||
            saved === 'Board' ||
            saved === 'Calendar' ||
            saved === 'Activity'
        ) {
            return saved;
        }
        return 'List';
    });

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Default issue view"
                description="Choose how issues open by default across your projects."
                icon="LayoutGrid"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {issueViewOptions.map((option) => (
                        <AccountSettingsIssueViewCard
                            key={option.id}
                            view={option.id}
                            icon={option.icon}
                            description={option.description}
                            selected={selectedLook === option.id}
                            onSelect={() => {
                                setSelectedLook(option.id);
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem(
                                        'selectedLook',
                                        option.id,
                                    );
                                }
                            }}
                        />
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                title="Interface theme"
                description="Choose how Orbit should render colors in your account."
                icon="Palette"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {themeOptions.map((option) => (
                        <AccountSettingsThemeCard
                            key={option.id}
                            id={option.id}
                            label={option.label}
                            subtitle={option.subtitle}
                            selected={theme === option.id}
                            onSelect={() => setTheme(option.id)}
                        />
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                title="Accent color"
                description="Pick the accent used for buttons, links, and highlights - one of the project colors, or any color of your own."
                icon="Paintbrush"
            >
                <div className="max-w-sm px-5 py-4">
                    <ColorPicker
                        value={getAccentSwatch(accentColor)}
                        onChange={(hex) => setAccentColor(accentFromHex(hex))}
                        palette={ACCENT_PALETTE}
                    />
                </div>
            </SettingsPanel>
        </div>
    );
}
