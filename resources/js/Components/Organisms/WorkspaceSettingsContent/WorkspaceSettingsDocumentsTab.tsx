import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

export default function WorkspaceSettingsDocumentsTab() {
    const { t } = useLaravelReactI18n();
    const [documentAccess, setDocumentAccess] = useState<'members' | 'guests'>(
        'members',
    );

    return (
        <div className="space-y-5">
            <SettingsPanel
                title={t('workspace_settings_documents.defaults.title')}
                description={t(
                    'workspace_settings_documents.defaults.description',
                )}
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-(--bg-light-color) bg-(--bg-color) p-4">
                        <p className="text-sm font-medium text-(--text-color)">
                            {t(
                                'workspace_settings_documents.defaults.access_level',
                            )}
                        </p>
                        <button
                            type="button"
                            className="mt-3 rounded-full border border-(--bg-light-color) px-3 py-1.5 text-xs font-medium text-(--text-color)"
                            onClick={() =>
                                setDocumentAccess(
                                    documentAccess === 'members'
                                        ? 'guests'
                                        : 'members',
                                )
                            }
                        >
                            {documentAccess === 'members'
                                ? t(
                                      'workspace_settings_documents.defaults.members_only',
                                  )
                                : t(
                                      'workspace_settings_documents.defaults.workspace_and_guests',
                                  )}
                        </button>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                className="rounded-md border border-(--bg-light-color) px-2 py-1 text-xs text-(--text-color)"
                            >
                                {t(
                                    'workspace_settings_documents.defaults.new_folder',
                                )}
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-(--bg-light-color) px-2 py-1 text-xs text-(--text-color)"
                            >
                                {t(
                                    'workspace_settings_documents.defaults.new_template',
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="rounded-xl border border-(--bg-light-color) bg-(--bg-color) p-4">
                        <p className="text-sm font-medium text-(--text-color)">
                            {t(
                                'workspace_settings_documents.defaults.structure_preview',
                            )}
                        </p>
                        <div className="mt-2 space-y-1.5">
                            {[
                                {
                                    name: t('followup2_misc.folders.product'),
                                    docs: 7,
                                },
                                {
                                    name: t(
                                        'followup2_misc.folders.engineering',
                                    ),
                                    docs: 11,
                                },
                                {
                                    name: t(
                                        'followup2_misc.folders.operations',
                                    ),
                                    docs: 5,
                                },
                            ].map((folder) => (
                                <div
                                    key={folder.name}
                                    className="rounded-md bg-(--bg-light-color) px-2 py-1 text-xs text-(--text-gray-color)"
                                >
                                    {t(
                                        'workspace_settings_documents.defaults.folder_docs',
                                        {
                                            name: folder.name,
                                            count: folder.docs,
                                        },
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title={t('workspace_settings_documents.knowledge.title')}
                description={t(
                    'workspace_settings_documents.knowledge.description',
                )}
            >
                <SettingsPanelRow
                    title={t(
                        'workspace_settings_documents.knowledge.indexing.title',
                    )}
                    description={t(
                        'workspace_settings_documents.knowledge.indexing.description',
                    )}
                />
                <SettingsPanelRow
                    title={t(
                        'workspace_settings_documents.knowledge.retention.title',
                    )}
                    description={t(
                        'workspace_settings_documents.knowledge.retention.description',
                    )}
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-(--bg-light-color) px-3 py-1.5 text-xs font-medium text-(--text-color)"
                        >
                            {t(
                                'workspace_settings_documents.knowledge.retention.value',
                            )}
                        </button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
