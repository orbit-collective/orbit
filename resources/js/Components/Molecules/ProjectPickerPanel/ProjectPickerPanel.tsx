import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { liftProps } from '@/utils/motion';

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
    const { t } = useLaravelReactI18n();

    if (projects.length <= 1) {
        return null;
    }

    return (
        <SettingsPanel
            id="project"
            collapsedSummary={
                projects.find((project) => project.id === selectedProjectId)
                    ?.name
            }
            title={t('project_picker_panel.title')}
            description={description}
            icon="FolderKanban"
        >
            <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                {projects.map((project, index) => {
                    const theme = getColorTheme(project.color);
                    const selected = project.id === selectedProjectId;

                    return (
                        <RowReveal key={project.id} index={index} fill>
                            <motion.button
                                type="button"
                                onClick={() => onSelect(project.id)}
                                {...liftProps}
                                className={cn(
                                    'group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-linear-to-br p-3 text-left transition-[border-color,box-shadow,background-color] duration-300',
                                    theme.gradient,
                                    theme.border,
                                    selected
                                        ? 'border-(--accent-color) shadow-lg'
                                        : 'border-(--border-color) bg-(--bg-color) hover:shadow-lg',
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
                                            'block truncate text-sm font-medium text-(--text-color)',
                                            theme.textGroupHover,
                                        )}
                                    >
                                        {project.name}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-(--text-gray-color)">
                                        <span
                                            className={cn(
                                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                                theme.accent,
                                            )}
                                        />
                                        {selected
                                            ? t('project_picker_panel.current')
                                            : t('project_picker_panel.switch')}
                                    </span>
                                </span>
                                {selected && (
                                    <span className="absolute top-2.5 right-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--accent-color) text-white">
                                        <Icon name="Check" size={11} />
                                    </span>
                                )}
                            </motion.button>
                        </RowReveal>
                    );
                })}
            </div>
        </SettingsPanel>
    );
}
