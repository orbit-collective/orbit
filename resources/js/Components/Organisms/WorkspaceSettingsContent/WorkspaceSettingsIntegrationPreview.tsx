import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import { IntegrationDefinition } from '@/types/Integrations';

interface WorkspaceSettingsIntegrationPreviewProps {
    integration: IntegrationDefinition;
}

/**
 * A small mock activity feed showing what this integration would actually
 * post/sync — a stand-in for a real screenshot until the integration ships,
 * and more honest than a generic decorative image.
 */
export default function WorkspaceSettingsIntegrationPreview({
    integration,
}: WorkspaceSettingsIntegrationPreviewProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-color)">
            <div className="flex items-center justify-between border-b border-(--border-color) bg-(--surface-color) px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md ${integration.accentClassName}`}
                    >
                        <BrandIcon
                            name={integration.brand}
                            className="h-3.5 w-3.5"
                        />
                    </span>
                    <span className="text-xs font-medium text-(--text-color)">
                        {integration.name} preview
                    </span>
                </div>
                <span className="rounded-full bg-(--bg-light-color) px-2 py-0.5 text-[10px] font-medium text-(--text-gray-color)">
                    Sample
                </span>
            </div>
            <div className="divide-y divide-(--border-color)">
                {integration.previewSamples.map((sample) => (
                    <div
                        key={sample.title}
                        className="flex items-start gap-3 px-4 py-3"
                    >
                        <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${integration.accentClassName}`}
                        >
                            <BrandIcon
                                name={integration.brand}
                                className="h-3.5 w-3.5"
                            />
                        </span>
                        <p className="min-w-0 flex-1 text-sm text-(--text-color)">
                            {sample.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-(--text-muted-color)">
                            {sample.time}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
