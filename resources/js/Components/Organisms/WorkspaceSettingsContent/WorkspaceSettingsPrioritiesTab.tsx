import { router } from '@inertiajs/react';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';

interface WorkspaceSettingsPrioritiesTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    priorities?: SettingsPriority[];
    hasPrioritiesAccess?: boolean;
    canCreatePriorities?: boolean;
    canUpdatePriorities?: boolean;
    canDeletePriorities?: boolean;
}

export default function WorkspaceSettingsPrioritiesTab({
    memberProjects = [],
    selectedProjectId = null,
    priorities = [],
    hasPrioritiesAccess = false,
}: WorkspaceSettingsPrioritiesTabProps) {
    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings/priorities?project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    if (!selectedProject || !hasPrioritiesAccess) {
        return (
            <SettingsPanel
                title="Priority scale"
                description="Name, color and order the priorities issues can have."
                icon="Flag"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's priorities"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its priorities here.'
                            : 'Ask a project admin for the priorities.view permission to see priorities here.'
                    }
                />
            </SettingsPanel>
        );
    }

    const defaultPriority = priorities.find((priority) => priority.isDefault);
    const issueCount = priorities.reduce(
        (sum, priority) => sum + priority.issueCount,
        0,
    );

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    variant="vivid"
                    title="Priority levels"
                    value={priorities.length}
                    icon="Flag"
                    color="accent"
                />
                <StatCard
                    variant="vivid"
                    title="Issues prioritised"
                    value={issueCount}
                    icon="ListChecks"
                    color="info"
                />
                <StatCard
                    variant="vivid"
                    title="Default for new issues"
                    value={defaultPriority?.name ?? 'None'}
                    icon="Star"
                    color="warning"
                />
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's priority scale you're viewing."
                onSelect={switchProject}
            />

            <SettingsPanel
                title="Priority scale"
                description={`Priorities available for issues in ${selectedProject.name}, most important first.`}
                icon="Flag"
            >
                {priorities.map((priority) => (
                    <div
                        key={priority.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    backgroundColor: `${priority.color}1f`,
                                }}
                            >
                                <PriorityIcon
                                    priority={priority}
                                    tooltip={false}
                                />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                        {priority.name}
                                    </p>
                                    {priority.isDefault && (
                                        <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <p className="truncate text-sm text-[var(--text-gray-color)]">
                                    {priority.issueCount === 1
                                        ? '1 issue'
                                        : `${priority.issueCount} issues`}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </SettingsPanel>
        </div>
    );
}
