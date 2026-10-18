/** A priority as an issue row carries it: enough to draw its icon and color without the project's list. */
export interface PriorityDetails {
    id: number;
    name: string;
    color: string;
    icon: string;
    position: number;
}

/** A priority of a project's scale, as the pickers and the settings tab list it. */
export interface ProjectPriority extends PriorityDetails {
    isDefault: boolean;
}

/** A priority as the dashboard counts it: grouped by name across the user's projects. */
export interface PriorityCount extends Omit<PriorityDetails, 'id'> {
    count: number;
}

/** A priority on the settings tab, with how many issues currently use it. */
export interface SettingsPriority extends ProjectPriority {
    issueCount: number;
}
