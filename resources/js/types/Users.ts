export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    avatar: string;
    created_at: string;
    updated_at: string;
}

export interface AssignableUser {
    id: number;
    name: string;
    avatar?: string | null;
}

export interface Session {
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    lastActiveAt: string;
    isCurrent: boolean;
}
