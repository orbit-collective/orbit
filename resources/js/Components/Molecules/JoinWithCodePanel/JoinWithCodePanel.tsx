import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface JoinWithCodePanelProps {
    token: string;
    error: string | null;
    isJoining: boolean;
    onChange: (token: string) => void;
    onSubmit: (event: SyntheticEvent) => void;
}

export default function JoinWithCodePanel({
    token,
    error,
    isJoining,
    onChange,
    onSubmit,
}: JoinWithCodePanelProps) {
    const { t } = useLaravelReactI18n();
    return (
        <SettingsPanel
            id="join"
            title={t('join_with_code_panel.title')}
            description={t('join_with_code_panel.description')}
            icon="Link"
        >
            <SettingsPanelRow
                title={t('join_with_code_panel.row_title')}
                description={t('join_with_code_panel.row_description')}
                action={
                    <form
                        onSubmit={onSubmit}
                        className="flex flex-col items-end gap-1.5"
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                value={token}
                                onChange={(event) =>
                                    onChange(event.target.value)
                                }
                                placeholder={t(
                                    'join_with_code_panel.placeholder',
                                )}
                                className="h-9 w-56"
                            />
                            <Button
                                type="submit"
                                isDisabled={isJoining}
                                className="h-9"
                            >
                                {t('join_with_code_panel.join')}
                            </Button>
                        </div>
                        {error && (
                            <span className="text-xs text-(--error-color)">
                                {error}
                            </span>
                        )}
                    </form>
                }
            />
        </SettingsPanel>
    );
}
