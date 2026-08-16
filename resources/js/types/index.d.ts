import { Notification } from './Notification';

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    email_verified_at?: string;
    role: 'admin' | 'member';
    has_completed_onboarding: boolean;
    has_completed_project_onboarding: boolean;
    session_lifetime: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    notifications: Notification[];
    hasProjects: boolean;
};
