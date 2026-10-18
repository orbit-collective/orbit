import { createContext, ReactNode, useContext, useMemo } from 'react';
import { ProjectPriority } from '@/types/Priorities';

interface ProjectPrioritiesContextType {
    /** The project's priorities, most important first. */
    priorities: ProjectPriority[];
    /** The priority a new issue gets when none is chosen, if the project has one. */
    defaultPriority: ProjectPriority | null;
    /** Case-insensitive, like the server's lookup. */
    findByName: (name: string | null | undefined) => ProjectPriority | null;
}

const ProjectPrioritiesContext = createContext<ProjectPrioritiesContextType>({
    priorities: [],
    defaultPriority: null,
    findByName: () => null,
});

interface ProjectPrioritiesProviderProps {
    priorities: ProjectPriority[];
    children: ReactNode;
}

export const ProjectPrioritiesProvider = ({
    priorities,
    children,
}: ProjectPrioritiesProviderProps) => {
    const value = useMemo<ProjectPrioritiesContextType>(
        () => ({
            priorities,
            defaultPriority:
                priorities.find((priority) => priority.isDefault) ?? null,
            findByName: (name) =>
                name
                    ? (priorities.find(
                          (priority) =>
                              priority.name.toLowerCase() ===
                              name.toLowerCase(),
                      ) ?? null)
                    : null,
        }),
        [priorities],
    );

    return (
        <ProjectPrioritiesContext.Provider value={value}>
            {children}
        </ProjectPrioritiesContext.Provider>
    );
};

export const useProjectPriorities = () => useContext(ProjectPrioritiesContext);
