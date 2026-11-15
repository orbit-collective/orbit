import { useLaravelReactI18n } from 'laravel-react-i18n';
import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import { IntegrationDefinition } from '@/types/Integrations';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface WorkspaceSettingsIntegrationHeroProps {
    integration: IntegrationDefinition;
    enabled: boolean;
    canUpdate: boolean;
    /** Enables or disables the integration. Left out when it is not a plain toggle (GitHub). */
    onToggle?: (enabled: boolean) => void;
}

/**
 * The top of an integration's page: its mark, name, state, one-line
 * description and the primary actions (enable / disable, open the vendor's
 * site).
 */
export default function WorkspaceSettingsIntegrationHero({
    integration,
    enabled,
    canUpdate,
    onToggle,
}: WorkspaceSettingsIntegrationHeroProps) {
    const { t } = useLaravelReactI18n();
    const text = useIntegrationText();
    const canToggle = !!onToggle && canUpdate && !integration.comingSoon;

    return (
        <header className="flex flex-col gap-5">
            <span
                className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-(--border-color)',
                    integration.accentClassName,
                )}
            >
                <BrandIcon name={integration.brand} className="h-8 w-8" />
            </span>

            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-2xl font-semibold text-(--text-color) sm:text-3xl">
                        {integration.name}
                    </h1>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            enabled && !integration.comingSoon
                                ? 'bg-(--accent-color-opacity) text-(--accent-color)'
                                : 'bg-(--bg-muted-color) text-(--text-muted-color)',
                        )}
                    >
                        {integration.comingSoon && (
                            <Icon name="Lock" size={11} />
                        )}
                        {text.status(integration, enabled)}
                    </span>
                </div>
                <p className="max-w-2xl text-base text-(--text-gray-color)">
                    {text.description(integration)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {canToggle && (
                    <Button
                        type="button"
                        onClick={() => onToggle(!enabled)}
                        className={cn(
                            'px-4 py-2',
                            enabled &&
                                'bg-(--bg-light-color) hover:bg-(--bg-light-color) hover:brightness-90',
                        )}
                    >
                        <Icon name={enabled ? 'Power' : 'Plug'} size={14} />
                        {enabled
                            ? t(
                                  'workspace_settings_integrations.detail.disable',
                              )
                            : t(
                                  'workspace_settings_integrations.detail.enable',
                              )}
                    </Button>
                )}
                <a
                    href={integration.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        'inline-flex items-center gap-2 rounded-xs bg-(--bg-light-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-all duration-150 hover:brightness-90',
                        FOCUS_RING,
                    )}
                >
                    <Icon name="ExternalLink" size={14} />
                    {t('workspace_settings_integrations.detail.visit_website', {
                        name: integration.name,
                    })}
                </a>
            </div>
        </header>
    );
}
