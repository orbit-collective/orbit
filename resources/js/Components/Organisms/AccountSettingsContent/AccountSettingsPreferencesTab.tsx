import { useLaravelReactI18n } from 'laravel-react-i18n';
import { KeyboardEvent, useState } from 'react';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import ColorPicker from '@/Components/Molecules/ColorPicker/ColorPicker';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsIssueViewCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard';
import AccountSettingsLanguageCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsLanguageCard';
import AccountSettingsThemeCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsThemeCard';
import { useAccent } from '@/context/AccentContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/hooks/useLanguage';
import { IssuePageLooks } from '@/types/Issues';
import { ThemeMode } from '@/types/Theme';
import {
    ACCENT_PALETTE,
    accentFromHex,
    getAccentSwatch,
} from '@/utils/accentColors';
import {
    setReducedMotion,
    useReducedMotionPreference,
} from '@/utils/motionPreference';

const issueViewOptions: Array<{
    id: IssuePageLooks;
    icon: 'Rows3' | 'Columns3' | 'CalendarDays' | 'Activity';
}> = [
    { id: 'List', icon: 'Rows3' },
    { id: 'Board', icon: 'Columns3' },
    { id: 'Calendar', icon: 'CalendarDays' },
    { id: 'Activity', icon: 'Activity' },
];

const themeOptions: ThemeMode[] = ['dark', 'light', 'system'];

/**
 * Arrow keys walk the language cards (Tab already reaches each one); picking
 * stays an explicit Enter / Space, so moving around never switches language.
 */
const moveFocusWithArrows = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
        event.key
    ];
    if (!step) return;

    const cards = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
            '[data-language-card]',
        ),
    );
    const current = cards.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;

    event.preventDefault();
    cards[(current + step + cards.length) % cards.length].focus();
};

export default function AccountSettingsPreferencesTab() {
    const { t } = useLaravelReactI18n();
    const { theme, setTheme } = useTheme();
    const { accentColor, setAccentColor } = useAccent();
    const { locale, locales, setLanguage } = useLanguage();
    const reducedMotion = useReducedMotionPreference();

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
                id="issue-view"
                collapsedSummary={t(
                    'account_settings.preferences.issue_view.summary',
                    {
                        view: t(
                            `account_settings.preferences.issue_view.views.${selectedLook}.name`,
                        ),
                    },
                )}
                title={t('account_settings.preferences.issue_view.title')}
                description={t(
                    'account_settings.preferences.issue_view.description',
                )}
                icon="LayoutGrid"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {issueViewOptions.map((option, index) => (
                        <RowReveal key={option.id} index={index} fill>
                            <AccountSettingsIssueViewCard
                                groupId="issue-view"
                                view={option.id}
                                icon={option.icon}
                                description={t(
                                    `account_settings.preferences.issue_view.views.${option.id}.description`,
                                )}
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
                        </RowReveal>
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                id="theme"
                collapsedSummary={
                    themeOptions.includes(theme)
                        ? t(
                              `account_settings.preferences.theme.options.${theme}.label`,
                          )
                        : undefined
                }
                title={t('account_settings.preferences.theme.title')}
                description={t(
                    'account_settings.preferences.theme.description',
                )}
                icon="Palette"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {themeOptions.map((option, index) => (
                        <RowReveal key={option} index={index} fill>
                            <AccountSettingsThemeCard
                                groupId="theme"
                                id={option}
                                label={t(
                                    `account_settings.preferences.theme.options.${option}.label`,
                                )}
                                subtitle={t(
                                    `account_settings.preferences.theme.options.${option}.subtitle`,
                                )}
                                selected={theme === option}
                                onSelect={() => setTheme(option)}
                            />
                        </RowReveal>
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                id="accent"
                title={t('account_settings.preferences.accent.title')}
                description={t(
                    'account_settings.preferences.accent.description',
                )}
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

            <SettingsPanel
                id="language"
                collapsedSummary={
                    locales.find((language) => language.code === locale)?.name
                }
                title={t('account_settings.preferences.language.title')}
                description={t(
                    'account_settings.preferences.language.description',
                )}
                icon="Languages"
            >
                <p id="language-description" className="sr-only">
                    {t('account_settings.preferences.language.description')}
                </p>
                <div
                    role="group"
                    aria-label={t(
                        'account_settings.preferences.language.title',
                    )}
                    aria-describedby="language-description"
                    onKeyDown={moveFocusWithArrows}
                    className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {locales.map((language, index) => (
                        <RowReveal key={language.code} index={index} fill>
                            <AccountSettingsLanguageCard
                                groupId="language"
                                code={language.code}
                                name={language.name}
                                subtitle={t(
                                    `account_settings.preferences.language.options.${language.code}`,
                                )}
                                selected={locale === language.code}
                                onSelect={() => setLanguage(language.code)}
                            />
                        </RowReveal>
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                id="reduced-motion"
                collapsedSummary={
                    reducedMotion
                        ? t('account_settings.on')
                        : t('account_settings.off')
                }
                title={t('account_settings.preferences.reduced_motion.title')}
                description={t(
                    'account_settings.preferences.reduced_motion.description',
                )}
                icon="Zap"
            >
                <SettingsPanelRow
                    title={t(
                        'account_settings.preferences.reduced_motion.title',
                    )}
                    description={t('account_settings.this_browser_only')}
                    action={
                        <ToggleSwitch
                            checked={reducedMotion}
                            onChange={setReducedMotion}
                            label={t(
                                'account_settings.preferences.reduced_motion.title',
                            )}
                        />
                    }
                />
            </SettingsPanel>
        </div>
    );
}
