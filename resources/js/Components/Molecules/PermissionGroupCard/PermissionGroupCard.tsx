import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { PermissionDefinition } from '@/types/Roles';
import {
    getPermissionDescription,
    getPermissionLabel,
} from '@/utils/permissions';
import { icons } from 'lucide-react';
import { useState } from 'react';

interface PermissionGroupCardSection {
    section: string;
    permissions: PermissionDefinition[];
}

interface PermissionGroupCardProps {
    label: string;
    icon: keyof typeof icons;
    sections: PermissionGroupCardSection[];
    permissionIds: number[];
    enabledIds: number[];
    canEdit: boolean;
    forceExpanded: boolean;
    onToggle: (permissionId: number, enabled: boolean) => void;
    onSetAll: (permissionIds: number[], enable: boolean) => void;
}

export default function PermissionGroupCard({
    label,
    icon,
    sections,
    permissionIds,
    enabledIds,
    canEdit,
    forceExpanded,
    onToggle,
    onSetAll,
}: PermissionGroupCardProps) {
    const [expanded, setExpanded] = useState(true);
    const isExpanded = forceExpanded || expanded;

    const enabledCount = permissionIds.filter((id) =>
        enabledIds.includes(id),
    ).length;
    const ratio =
        permissionIds.length === 0
            ? 0
            : Math.round((enabledCount / permissionIds.length) * 100);
    const isComplete =
        permissionIds.length > 0 && enabledCount === permissionIds.length;

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] transition-colors">
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-light-color-hover)]"
            >
                <div className="flex items-center gap-2.5">
                    <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isComplete
                                ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                                : 'bg-[var(--accent-color-opacity)] text-[var(--accent-color)]'
                        }`}
                    >
                        <Icon name={icon} size={13} />
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-color)]">
                        {label}
                    </span>
                    <span className="text-xs text-[var(--text-gray-color)]">
                        {enabledCount}/{permissionIds.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                        <div
                            className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
                            style={{ width: `${ratio}%` }}
                        />
                    </div>
                    {canEdit && (
                        <div
                            className="flex items-center gap-2 text-[11px] font-medium"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => onSetAll(permissionIds, true)}
                                className="text-[var(--accent-color)] hover:underline"
                            >
                                All
                            </button>
                            <span className="text-[var(--text-gray-color)]">
                                /
                            </span>
                            <button
                                type="button"
                                onClick={() => onSetAll(permissionIds, false)}
                                className="text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                            >
                                None
                            </button>
                        </div>
                    )}
                    {!forceExpanded && (
                        <Icon
                            name="ChevronDown"
                            size={14}
                            className={`text-[var(--text-gray-color)] transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                    {sections.map((section) => (
                        <div key={section.section} className="px-4 py-3">
                            {section.section !== 'General' && (
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                    {section.section}
                                </p>
                            )}
                            <div className="space-y-2.5">
                                {section.permissions.map((permission) => (
                                    <div
                                        key={permission.id}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm text-[var(--text-color)]">
                                                {getPermissionLabel(permission)}
                                            </p>
                                            <p className="text-xs text-[var(--text-gray-color)]">
                                                {getPermissionDescription(
                                                    permission,
                                                )}
                                            </p>
                                        </div>
                                        <ToggleSwitch
                                            checked={enabledIds.includes(
                                                permission.id,
                                            )}
                                            disabled={!canEdit}
                                            onChange={(checked) =>
                                                onToggle(permission.id, checked)
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
