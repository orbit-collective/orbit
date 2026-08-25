import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { IntegrationDefinition } from '@/types/Integrations';

interface AccountSettingsIntegrationCardProps {
    integration: IntegrationDefinition;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    onOpen: () => void;
}

export default function AccountSettingsIntegrationCard({
    integration,
    enabled,
    onToggle,
    onOpen,
}: AccountSettingsIntegrationCardProps) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-color-strong)] hover:shadow-lg"
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${integration.accentClassName}`}
                >
                    <BrandIcon name={integration.brand} className="h-5 w-5" />
                </span>
                <div
                    onClick={(event) => event.stopPropagation()}
                    className="pt-1"
                >
                    <ToggleSwitch
                        checked={enabled}
                        onChange={onToggle}
                        disabled={integration.comingSoon}
                    />
                </div>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-color)]">
                        {integration.name}
                    </h3>
                    {integration.comingSoon ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-light-color)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                            <Icon name="Lock" size={10} />
                            Soon
                        </span>
                    ) : (
                        <span className="rounded-full bg-[var(--accent-color-opacity)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-color)]">
                            New
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted-color)]">
                    {integration.vendor}
                </p>
                <p className="mt-2 text-sm text-[var(--text-gray-color)]">
                    {integration.description}
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                <span className="text-xs font-medium text-[var(--text-muted-color)]">
                    {integration.category}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-gray-color)] transition-colors group-hover:text-[var(--accent-color)]">
                    View details
                    <Icon name="ChevronRight" size={13} />
                </span>
            </div>
        </div>
    );
}
