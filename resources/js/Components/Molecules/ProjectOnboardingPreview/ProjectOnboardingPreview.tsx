import Icon from '@/Components/Atoms/Icon/Icon';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import { ProjectOnboardingPreviewProps } from '@/types/Components';
import { getColorTheme } from '@/utils/colors';

const PERKS = [
    'Track issues on a custom board',
    'Invite your team to collaborate',
    'Visualize progress in real time',
];

export default function ProjectOnboardingPreview({
    data,
}: ProjectOnboardingPreviewProps) {
    const theme = getColorTheme(data.color);

    return (
        <div
            className={`relative order-1 flex flex-col justify-center gap-5 overflow-hidden bg-gradient-to-br p-6 sm:p-8 md:order-2 md:p-10 ${theme.gradient}`}
        >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                Live preview
            </span>
            <ProjectCard
                project={{
                    id: 0,
                    name: data.name || 'Untitled Project',
                    slug: data.slug || 'SLUG',
                    description: data.description,
                    color: data.color,
                    created_at: 0,
                    updated_at: 0,
                }}
                issues={[]}
            />
            <ul className="space-y-2.5">
                {PERKS.map((perk) => (
                    <li
                        key={perk}
                        className="flex items-center gap-2.5 text-xs text-[var(--text-gray-color)]"
                    >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                            <Icon name="Check" size={11} />
                        </span>
                        {perk}
                    </li>
                ))}
            </ul>
        </div>
    );
}
