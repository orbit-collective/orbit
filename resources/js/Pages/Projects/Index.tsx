import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import ProjectCard, {
    ProjectNewCard,
} from '@/Components/Molecules/ProjectCard/ProjectCard';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useShortcuts } from '@/context/ShortcutContext';
import { Project } from '@/types/Projects';

function Index({ projects }: { projects: Project[] }) {
    const { triggerShortcut } = useShortcuts();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />
            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <PageHeader
                    title={'Projects'}
                    icon="FolderGit2"
                    primaryAction={{
                        label: 'New project',
                        icon: 'Plus',
                        onClick: () => triggerShortcut('p'),
                    }}
                />
                <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                    {projects.length > 0 ? (
                        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    issues={project.issues ?? []}
                                />
                            ))}
                            <ProjectNewCard />
                        </section>
                    ) : (
                        <EmptyStateCard
                            title={'Your dashboard is empty'}
                            description={
                                'It looks like you don’t have any projects yet. Create your first project to start organizing your work.'
                            }
                            iconName={'FolderPlus'}
                            actionLabel={'Create Project'}
                            actionShortcut={'p'}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}

export default Index;
