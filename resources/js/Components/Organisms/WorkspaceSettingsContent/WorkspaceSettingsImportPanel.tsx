import Input from '@/Components/Atoms/Input/Input';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import {
    IntegrationDefinition,
    IntegrationFieldMappingType,
} from '@/types/Integrations';
import {
    ImportIntegrationSettings,
    IntegrationFieldMappingDraft,
    IntegrationMappingOption,
} from '@/types/ProjectIntegrations';
import { useEffect, useState } from 'react';

interface WorkspaceSettingsImportPanelProps {
    integration: IntegrationDefinition;
    canUpdate: boolean;
    settings: ImportIntegrationSettings | null;
    onConnect: (credentials: Record<string, string>) => void;
    onSaveMappings: (mappings: IntegrationFieldMappingDraft[]) => void;
    onImport: (projectKey: string) => void;
}

/**
 * Orbit's own fixed enums - a mapping row's target side is always one of
 * these, regardless of which remote system produced the source side.
 */
const ORBIT_VALUE_OPTIONS: Record<
    IntegrationFieldMappingType,
    IntegrationMappingOption[]
> = {
    status: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'closed', label: 'Closed' },
    ],
    priority: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
    ],
    label: [
        { value: 'bug', label: 'Bug' },
        { value: 'feature', label: 'Feature' },
        { value: 'performance', label: 'Performance' },
        { value: 'design', label: 'Design' },
        { value: 'ux', label: 'UX' },
        { value: 'chore', label: 'Chore' },
    ],
};

const MAPPING_TYPE_LABELS: Record<IntegrationFieldMappingType, string> = {
    status: 'Statuses',
    priority: 'Priorities',
    label: 'Labels',
};

function mappingKey(mappingType: string, externalValue: string): string {
    return `${mappingType}:${externalValue}`;
}

/**
 * The settings panel for an 'import'-kind integration (see IntegrationKind
 * in Integrations.ts): connect credentials, map the remote system's
 * statuses/priorities to Orbit's fixed set, then trigger an import.
 * Parameterized entirely by integration.importConfig, so a future importer
 * (Linear, Asana, Trello) plugs into this same panel with a different
 * credential-field/mapping-type list, not a new component.
 */
export default function WorkspaceSettingsImportPanel({
    integration,
    canUpdate,
    settings,
    onConnect,
    onSaveMappings,
    onImport,
}: WorkspaceSettingsImportPanelProps) {
    const importConfig = integration.importConfig;

    const [credentialDrafts, setCredentialDrafts] = useState<
        Record<string, string>
    >({});
    const [projectKey, setProjectKey] = useState('');
    const [mappingDrafts, setMappingDrafts] = useState<Record<string, string>>(
        {},
    );

    useEffect(() => {
        setCredentialDrafts(
            Object.fromEntries(
                (importConfig?.credentialFields ?? []).map((field) => [
                    field.id,
                    field.id === 'instance_url'
                        ? (settings?.instanceUrl ?? '')
                        : '',
                ]),
            ),
        );
        // Credential values (other than the non-secret instance_url) are
        // never sent back from the server once saved - re-entering them is
        // required to reconnect, same as Discord's webhook URL masking.
    }, [integration.id, settings?.instanceUrl, importConfig]);

    useEffect(() => {
        const initial: Record<string, string> = {};

        (settings?.fieldMappings ?? []).forEach((mapping) => {
            initial[mappingKey(mapping.mappingType, mapping.externalValue)] =
                mapping.orbitValue;
        });

        setMappingDrafts(initial);
    }, [integration.id, settings?.fieldMappings]);

    if (!importConfig) return null;

    const mappingOptionsFor = (
        mappingType: IntegrationFieldMappingType,
    ): IntegrationMappingOption[] => {
        if (!settings?.mappingMetadata) return [];

        switch (mappingType) {
            case 'status':
                return settings.mappingMetadata.statuses;
            case 'priority':
                return settings.mappingMetadata.priorities;
            default:
                // Remote labels/components have no fixed registry to
                // enumerate up front (unlike status/priority) - unmapped
                // labels are simply omitted on import rather than mapped here.
                return [];
        }
    };

    const handleSaveMappings = () => {
        const mappings: IntegrationFieldMappingDraft[] = [];

        importConfig.mappingTypes.forEach((mappingType) => {
            mappingOptionsFor(mappingType).forEach((option) => {
                const orbitValue =
                    mappingDrafts[mappingKey(mappingType, option.value)];

                if (orbitValue) {
                    mappings.push({
                        mapping_type: mappingType,
                        external_value: option.value,
                        external_label: option.label,
                        orbit_value: orbitValue,
                    });
                }
            });
        });

        onSaveMappings(mappings);
    };

    return (
        <>
            <section className="mt-6">
                <h3 className="text-sm font-semibold text-[var(--text-color)]">
                    Connect
                </h3>
                {canUpdate ? (
                    <div className="mt-3 space-y-3">
                        {importConfig.credentialFields.map((field) => (
                            <div key={field.id}>
                                <label
                                    htmlFor={`import-credential-${field.id}`}
                                    className="mb-1 block text-sm text-[var(--text-gray-color)]"
                                >
                                    {field.label}
                                </label>
                                <Input
                                    id={`import-credential-${field.id}`}
                                    variant="modal"
                                    type={field.type}
                                    value={credentialDrafts[field.id] ?? ''}
                                    onChange={(event) =>
                                        setCredentialDrafts((prev) => ({
                                            ...prev,
                                            [field.id]: event.target.value,
                                        }))
                                    }
                                    placeholder={field.placeholder}
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => onConnect(credentialDrafts)}
                            className="rounded-lg bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                            {settings?.hasCredentials ? 'Reconnect' : 'Connect'}
                        </button>
                        {settings?.hasCredentials && (
                            <p className="text-sm text-[var(--text-gray-color)]">
                                Connected to {settings.instanceUrl}.
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                        {settings?.hasCredentials
                            ? `Connected to ${settings.instanceUrl}.`
                            : 'Not connected yet.'}
                    </p>
                )}
            </section>

            {settings?.hasCredentials && (
                <>
                    <section className="mt-6">
                        <h3 className="text-sm font-semibold text-[var(--text-color)]">
                            Field mapping
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                            Map {integration.name}&apos;s values to Orbit&apos;s
                            — anything left unmapped falls back to a sensible
                            default.
                        </p>
                        {importConfig.mappingTypes.map((mappingType) => {
                            const options = mappingOptionsFor(mappingType);

                            if (options.length === 0) return null;

                            return (
                                <div key={mappingType} className="mt-4">
                                    <p className="text-sm font-medium text-[var(--text-color)]">
                                        {MAPPING_TYPE_LABELS[mappingType]}
                                    </p>
                                    <div className="mt-2 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
                                        {options.map((option) => (
                                            <div
                                                key={option.value}
                                                className="flex items-center justify-between gap-4 px-4 py-2.5"
                                            >
                                                <span className="text-sm text-[var(--text-color)]">
                                                    {option.label}
                                                </span>
                                                <InlineSelectDropdown
                                                    label={`Map to Orbit ${MAPPING_TYPE_LABELS[mappingType].toLowerCase()}`}
                                                    placeholder="Default"
                                                    options={
                                                        ORBIT_VALUE_OPTIONS[
                                                            mappingType
                                                        ]
                                                    }
                                                    value={
                                                        mappingDrafts[
                                                            mappingKey(
                                                                mappingType,
                                                                option.value,
                                                            )
                                                        ] ?? null
                                                    }
                                                    onChange={(nextValue) =>
                                                        setMappingDrafts(
                                                            (prev) => ({
                                                                ...prev,
                                                                [mappingKey(
                                                                    mappingType,
                                                                    option.value,
                                                                )]:
                                                                    nextValue ??
                                                                    '',
                                                            }),
                                                        )
                                                    }
                                                    disabled={!canUpdate}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {canUpdate && (
                            <button
                                type="button"
                                onClick={handleSaveMappings}
                                className="mt-3 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-2 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                            >
                                Save mapping
                            </button>
                        )}
                    </section>

                    <section className="mt-6">
                        <h3 className="text-sm font-semibold text-[var(--text-color)]">
                            Import
                        </h3>
                        {canUpdate ? (
                            <div className="mt-3 flex items-center gap-2">
                                <Input
                                    id="import-project-key"
                                    variant="modal"
                                    value={projectKey}
                                    onChange={(event) =>
                                        setProjectKey(event.target.value)
                                    }
                                    placeholder={`${integration.name} project key`}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    disabled={!projectKey}
                                    onClick={() => onImport(projectKey)}
                                    className="shrink-0 rounded-lg bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Import
                                </button>
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                                Only a project admin can trigger an import.
                            </p>
                        )}
                        {settings?.lastImport && (
                            <p className="mt-2 text-sm text-[var(--text-gray-color)]">
                                Last import (
                                {new Date(
                                    settings.lastImport.ranAt,
                                ).toLocaleString()}
                                ): {settings.lastImport.imported} imported,{' '}
                                {settings.lastImport.skipped} skipped,{' '}
                                {settings.lastImport.failed} failed.
                            </p>
                        )}
                    </section>
                </>
            )}
        </>
    );
}
