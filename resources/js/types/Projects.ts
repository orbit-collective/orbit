import { WorkflowStatusCategory } from '@/types/Workflow';

export type IssueCategoryCounts = Record<WorkflowStatusCategory, number>;

export interface Project {
    id: number;
    name: string;
    slug: string;
    description: string;
    color: ProjectColors;
    created_at: number;
    updated_at: number;
    /** Issues per workflow status category, counted by the server for the project card. */
    issue_counts?: IssueCategoryCounts;
    columns?: Record<string, boolean>;
}

export type ProjectColors =
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'lime'
    | 'blue'
    | 'sky'
    | 'violet'
    | 'purple'
    | 'pink';

export const AVAILABLE_COLORS: ProjectColors[] = [
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
];
