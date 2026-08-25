import { INTEGRATIONS, IntegrationId } from '@/types/Integrations';
import { useState } from 'react';
import AccountSettingsIntegrationCard from './AccountSettingsIntegrationCard';
import AccountSettingsIntegrationDetailModal from './AccountSettingsIntegrationDetailModal';

export default function AccountSettingsIntegrationsTab() {
    const [enabled, setEnabled] = useState<Record<IntegrationId, boolean>>({
        discord: false,
        slack: false,
        github: false,
        'google-drive': false,
        'google-calendar': false,
    });
    const [openIntegrationId, setOpenIntegrationId] =
        useState<IntegrationId | null>(null);

    const openIntegration =
        INTEGRATIONS.find(
            (integration) => integration.id === openIntegrationId,
        ) ?? null;

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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {INTEGRATIONS.map((integration) => (
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
