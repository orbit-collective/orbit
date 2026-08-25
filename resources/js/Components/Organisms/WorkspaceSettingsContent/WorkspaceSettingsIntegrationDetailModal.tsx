import Badge from '@/Components/Atoms/Badge/Badge';
import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import { IntegrationDefinition } from '@/types/Integrations';
import { getCategoryBadgeClassName } from '@/utils/integrationCategoryColors';
import WorkspaceSettingsIntegrationPreview from './WorkspaceSettingsIntegrationPreview';

interface WorkspaceSettingsIntegrationDetailModalProps {
    integration: IntegrationDefinition | null;
    enabled: boolean;
    canUpdate: boolean;
    onToggle: (enabled: boolean) => void;
    onClose: () => void;
}

export default function WorkspaceSettingsIntegrationDetailModal({
    integration,
    enabled,
    canUpdate,
    onToggle,
    onClose,
}: WorkspaceSettingsIntegrationDetailModalProps) {
    if (!integration) return null;

    return (
        <Modal isOpen={!!integration} onClose={onClose} size="md">
            <header className="flex items-start justify-between gap-4 border-b border-[var(--bg-light-color)] px-6 py-5">
                <div className="flex items-center gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${integration.accentClassName}`}
                    >
                        <BrandIcon
                            name={integration.brand}
                            className="h-5 w-5"
                        />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-[var(--text-color)]">
                                {integration.name}
                            </h2>
                            <Badge
                                variant="outline"
                                className={getCategoryBadgeClassName(
                                    integration.category,
                                )}
                            >
                                {integration.category}
                            </Badge>
                        </div>
                        <p className="text-sm text-[var(--text-gray-color)]">
                            {integration.vendor}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={integration.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit the ${integration.name} website`}
                        title={`Visit the ${integration.name} website`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                    >
                        <Icon name="ExternalLink" size={16} />
                    </a>
                    {integration.comingSoon ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bg-light-color)] px-3 py-1.5 text-sm text-[var(--text-gray-color)]">
                            <Icon name="Lock" size={14} />
                            Coming soon
                        </span>
                    ) : canUpdate ? (
                        <button
                            type="button"
                            onClick={() => onToggle(!enabled)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                enabled
                                    ? 'border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] text-[var(--text-color)] hover:border-[var(--border-color-strong)]'
                                    : 'bg-[var(--accent-color)] text-white hover:opacity-90'
                            }`}
                        >
                            <Icon
                                name={enabled ? 'CircleCheck' : 'Plug'}
                                size={14}
                            />
                            {enabled ? 'Connected' : 'Connect'}
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bg-light-color)] px-3 py-1.5 text-sm text-[var(--text-gray-color)]">
                            <Icon
                                name={enabled ? 'CircleCheck' : 'Circle'}
                                size={14}
                            />
                            {enabled ? 'Connected' : 'Not connected'}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                    >
                        <Icon name="X" size={16} />
                    </button>
                </div>
            </header>

            <div className="overflow-y-auto px-6 py-5">
                <WorkspaceSettingsIntegrationPreview
                    integration={integration}
                />

                <section className="mt-6">
                    <h3 className="text-sm font-semibold text-[var(--text-color)]">
                        Overview
                    </h3>
                    <EditableMarkdown
                        value={integration.overview}
                        onSave={() => {}}
                        disabled
                        className="mt-2"
                    />
                </section>

                <section className="mt-6">
                    <h3 className="text-sm font-semibold text-[var(--text-color)]">
                        Options
                    </h3>
                    <div className="mt-3 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
                        {integration.subOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex items-center justify-between gap-4 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-color)]">
                                        {option.title}
                                    </p>
                                    <p className="mt-0.5 text-sm text-[var(--text-gray-color)]">
                                        {option.description}
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={enabled && !integration.comingSoon}
                                    onChange={() => {}}
                                    disabled={
                                        integration.comingSoon ||
                                        !enabled ||
                                        !canUpdate
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
