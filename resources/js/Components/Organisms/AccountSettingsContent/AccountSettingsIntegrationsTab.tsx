import {
    INTEGRATION_CATEGORIES,
    IntegrationCategory,
    IntegrationId,
    INTEGRATIONS,
} from '@/types/Integrations';
import { cn } from '@/utils/cn';
import { useMemo, useState } from 'react';
import AccountSettingsIntegrationCard from './AccountSettingsIntegrationCard';
import AccountSettingsIntegrationDetailModal from './AccountSettingsIntegrationDetailModal';

type CategoryFilter = IntegrationCategory | 'All';

const CATEGORY_FILTERS: CategoryFilter[] = ['All', ...INTEGRATION_CATEGORIES];

export default function AccountSettingsIntegrationsTab() {
    const [enabled, setEnabled] = useState<Record<IntegrationId, boolean>>(
        () =>
            Object.fromEntries(
                INTEGRATIONS.map((integration) => [integration.id, false]),
            ) as Record<IntegrationId, boolean>,
    );
    const [openIntegrationId, setOpenIntegrationId] =
        useState<IntegrationId | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

    const openIntegration =
        INTEGRATIONS.find(
            (integration) => integration.id === openIntegrationId,
        ) ?? null;

    const filteredIntegrations = useMemo(
        () =>
            activeCategory === 'All'
                ? INTEGRATIONS
                : INTEGRATIONS.filter(
                      (integration) => integration.category === activeCategory,
                  ),
        [activeCategory],
    );

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-semibold text-[var(--text-color)]">
                    Your integrations
                </h2>
                <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                    Connect third-party tools to bring activity from Orbit into
                    the apps your team already uses.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((category) => {
                    const isActive = category === activeCategory;
                    const count =
                        category === 'All'
                            ? INTEGRATIONS.length
                            : INTEGRATIONS.filter(
                                  (integration) =>
                                      integration.category === category,
                              ).length;

                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory(category)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-[var(--accent-color)] text-white'
                                    : 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                            )}
                        >
                            {category}
                            <span
                                className={cn(
                                    'text-xs',
                                    isActive
                                        ? 'text-white/70'
                                        : 'text-[var(--text-muted-color)]',
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredIntegrations.map((integration) => (
                    <AccountSettingsIntegrationCard
                        key={integration.id}
                        integration={integration}
                        enabled={enabled[integration.id]}
                        onToggle={(checked) =>
                            setEnabled((previous) => ({
                                ...previous,
                                [integration.id]: checked,
                            }))
                        }
                        onOpen={() => setOpenIntegrationId(integration.id)}
                    />
                ))}
            </div>

            <AccountSettingsIntegrationDetailModal
                integration={openIntegration}
                enabled={openIntegration ? enabled[openIntegration.id] : false}
                onToggle={(checked) => {
                    if (!openIntegration) return;

                    setEnabled((previous) => ({
                        ...previous,
                        [openIntegration.id]: checked,
                    }));
                }}
                onClose={() => setOpenIntegrationId(null)}
            />
        </div>
    );
}
