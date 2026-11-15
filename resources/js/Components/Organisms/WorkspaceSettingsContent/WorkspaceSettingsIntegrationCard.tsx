import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Badge from '@/Components/Atoms/Badge/Badge';
import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import { IntegrationDefinition } from '@/types/Integrations';
import { cn } from '@/utils/cn';
import { getCategoryBadgeClassName } from '@/utils/integrationCategoryColors';

interface WorkspaceSettingsIntegrationCardProps {
    integration: IntegrationDefinition;
    enabled: boolean;
    canUpdate: boolean;
    /** The integration's own page. */
    href: string;
    /**
     * The quick on/off switch. Left out for an integration that is not a
     * plain toggle (GitHub is an installation flow on its own page).
     */
    onToggle?: (enabled: boolean) => void;
    /**
     * `card` is the tall tile of the grid, `row` a compact line for the
     * list: the same link, switch and badges, laid out in one row.
     */
    variant?: 'card' | 'row';
}

/**
 * One integration in the overview grid. The name is the link to the
 * integration's page and stretches over the whole card, so the card is a
 * single Tab stop for opening it while the switch stays a separate control
 * (never a button inside a link).
 */
export default function WorkspaceSettingsIntegrationCard({
    integration,
    enabled,
    canUpdate,
    href,
    onToggle,
    variant = 'card',
}: WorkspaceSettingsIntegrationCardProps) {
    const { t } = useLaravelReactI18n();
    const text = useIntegrationText();

    const toggle = onToggle && (
        <div className="relative z-10 flex shrink-0 items-center">
            <ToggleSwitch
                checked={enabled}
                onChange={onToggle}
                disabled={integration.comingSoon || !canUpdate}
                label={t('workspace_settings_integrations.card.toggle', {
                    name: integration.name,
                })}
            />
        </div>
    );
    const stateBadge = integration.comingSoon ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-(--bg-light-color) px-2 py-0.5 text-[11px] font-medium text-(--text-gray-color)">
            <Icon name="Lock" size={10} />
            {t('workspace_settings_integrations.card.soon')}
        </span>
    ) : (
        <span
            className={`rounded-full ${enabled ? 'bg-(--accent-color-opacity) text-(--accent-color)' : 'bg-(--bg-muted-color) text-(--text-muted-color)'} px-2 py-0.5 text-[11px] font-semibold`}
        >
            {enabled
                ? t('workspace_settings_integrations.card.enabled')
                : t('workspace_settings_integrations.card.disabled')}
        </span>
    );
    const nameLink = (
        <Link
            href={href}
            className="rounded-sm outline-hidden after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-(--accent-color)"
        >
            {integration.name}
        </Link>
    );
    const categoryBadge = (
        <Badge
            variant="outline"
            className={getCategoryBadgeClassName(integration.category)}
        >
            {t(
                `workspace_settings_integrations.categories.${integration.category.toLowerCase().replace(' ', '_')}`,
            )}
        </Badge>
    );

    if (variant === 'row') {
        return (
            <div
                className={cn(
                    'group relative flex items-center gap-3 rounded-xl border border-(--border-color) bg-(--surface-color) p-3 text-left transition-colors duration-150 sm:gap-4 sm:px-4',
                    'hover:border-(--border-color-strong) hover:bg-(--bg-light-color)',
                    'focus-within:border-(--accent-color)',
                )}
            >
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${integration.accentClassName}`}
                >
                    <BrandIcon name={integration.brand} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-sm font-semibold text-(--text-color)">
                            {nameLink}
                        </h3>
                        {stateBadge}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-(--text-gray-color)">
                        {text.description(integration)}
                    </p>
                </div>
                <span className="hidden shrink-0 md:inline-flex">
                    {categoryBadge}
                </span>
                {/* Keeps the columns of the rows aligned when one has no switch. */}
                {toggle ?? (
                    <span aria-hidden="true" className="h-5 w-9 shrink-0" />
                )}
                <Icon
                    name="ChevronRight"
                    size={14}
                    className="hidden shrink-0 text-(--text-muted-color) transition-colors group-focus-within:text-(--accent-color) group-hover:text-(--accent-color) sm:block"
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'group relative flex h-full flex-col gap-4 rounded-2xl border border-(--border-color) bg-(--surface-color) p-5 text-left transition-all duration-150',
                'hover:-translate-y-0.5 hover:border-(--border-color-strong) hover:shadow-lg',
                'focus-within:border-(--accent-color)',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${integration.accentClassName}`}
                >
                    <BrandIcon name={integration.brand} className="h-5 w-5" />
                </span>
                {toggle && <div className="pt-0.5">{toggle}</div>}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-(--text-color)">
                        {nameLink}
                    </h3>
                    {stateBadge}
                </div>
                <p className="mt-0.5 text-sm text-(--text-muted-color)">
                    {text.vendor(integration)}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-gray-color)">
                    {text.description(integration)}
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-(--border-color) pt-3">
                {categoryBadge}
                <span
                    aria-hidden="true"
                    className="flex items-center gap-1 text-sm font-medium text-(--text-gray-color) transition-colors group-focus-within:text-(--accent-color) group-hover:text-(--accent-color)"
                >
                    {t('workspace_settings_integrations.card.view_details')}
                    <Icon name="ChevronRight" size={14} />
                </span>
            </div>
        </div>
    );
}
