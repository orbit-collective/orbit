import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';

interface ProjectPickerPanelProps {
    projects: MemberProjectSummary[];
    selectedProjectId: number;
    description: string;
    onSelect: (projectId: number) => void;
}

export default function ProjectPickerPanel({
    projects,
    selectedProjectId,
    description,
    onSelect,
}: ProjectPickerPanelProps) {
    if (projects.length <= 1) {
        return null;
    }

    return (
        <SettingsPanel
            title="Project"
            description={description}
            icon="FolderKanban"
        >
            <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                {projects.map((project) => {
                    const theme = getColorTheme(project.color);
                    const selected = project.id === selectedProjectId;

                    return (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => onSelect(project.id)}
                            className={cn(
                                'group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-gradient-to-br p-3 text-left transition-all duration-300',
                                theme.gradient,
                                theme.border,
                                selected
                                    ? 'border-[var(--accent-color)] shadow-lg'
                                    : 'border-[var(--border-color)] bg-[var(--bg-color)] hover:-translate-y-0.5 hover:shadow-lg',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                    theme.badgeBg,
                                )}
                            >
                                <Icon name="FolderKanban" size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span
                                    className={cn(
                                        'block truncate text-sm font-medium text-[var(--text-color)]',
                                        theme.textGroupHover,
                                    )}
                                >
                                    {project.name}
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-gray-color)]">
                                    <span
                                        className={cn(
                                            'h-1.5 w-1.5 shrink-0 rounded-full',
                                            theme.accent,
                                        )}
                                    />
                                    {selected
                                        ? 'Currently viewing'
                                        : 'Switch to this project'}
                                </span>
                            </span>
                            {selected && (
                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-white">
                                    <Icon name="Check" size={11} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </SettingsPanel>
    );
}
