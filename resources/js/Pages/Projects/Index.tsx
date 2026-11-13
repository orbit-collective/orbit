import { useLaravelReactI18n } from 'laravel-react-i18n';
import { PageSection, PageStage } from '@/Components/Atoms/PageStage/PageStage';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import ProjectCard, {
    ProjectNewCard,
} from '@/Components/Molecules/ProjectCard/ProjectCard';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useCommandPalette } from '@/context/CommandContext';
import { Project } from '@/types/Projects';

function Index({ projects }: { projects: Project[] }) {
    const { runCommand } = useCommandPalette();
    const { t } = useLaravelReactI18n();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-(--bg-color)">
            <Sidebar projects={projects} />
            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-(--bg-color-hover)">
                <PageHeader
                    title={t('page_projects.title')}
                    icon="FolderGit2"
                    primaryAction={{
                        label: t('page_projects.new_project'),
                        icon: 'Plus',
                        onClick: () => runCommand('project.create'),
                    }}
                />
                <PageStage
                    as="main"
                    className="flex flex-1 flex-col gap-6 overflow-y-auto p-6"
                >
                    {projects.length > 0 ? (
                        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {projects.map((project, index) => (
                                <RowReveal key={project.id} index={index} fill>
                                    <ProjectCard project={project} />
                                </RowReveal>
                            ))}
                            <RowReveal index={projects.length} fill>
                                <ProjectNewCard />
                            </RowReveal>
                        </section>
                    ) : (
                        <PageSection>
                            <EmptyStateCard
                                title={t('page_projects.empty.title')}
                                description={t(
                                    'page_projects.empty.description',
                                )}
                                iconName={'FolderPlus'}
                                actionLabel={t('page_projects.empty.action')}
                                actionCommand={'project.create'}
                            />
                        </PageSection>
                    )}
                </PageStage>
            </div>
        </div>
    );
}

export default Index;
