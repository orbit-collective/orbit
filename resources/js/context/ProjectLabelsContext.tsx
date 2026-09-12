import { ProjectLabel } from '@/types/Labels';
import { hashLabelColor } from '@/utils/labelColors';
import { createContext, ReactNode, useContext, useMemo } from 'react';

interface ProjectLabelsContextType {
    labels: ProjectLabel[];
    getColor: (name: string) => string;
}

const ProjectLabelsContext = createContext<ProjectLabelsContextType>({
    labels: [],
    getColor: hashLabelColor,
});

interface ProjectLabelsProviderProps {
    labels: ProjectLabel[];
    children: ReactNode;
}

export const ProjectLabelsProvider = ({
    labels,
    children,
}: ProjectLabelsProviderProps) => {
    const value = useMemo<ProjectLabelsContextType>(
        () => ({
            labels,
            getColor: (name) =>
                labels.find((label) => label.name === name)?.color ??
                hashLabelColor(name),
        }),
        [labels],
    );

    return (
        <ProjectLabelsContext.Provider value={value}>
            {children}
        </ProjectLabelsContext.Provider>
    );
};

export const useProjectLabels = () => useContext(ProjectLabelsContext);
