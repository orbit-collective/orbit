export interface ActivityLogEntry {
    id: number;
    body: string;
    userId: number | null;
    userName: string | null;
    userAvatar: string | null;
    createdAt: string;
}

export interface ActivityLogGroup {
    key: string;
    userId: number | null;
    userName: string | null;
    userAvatar: string | null;
    createdAt: string;
    entries: ActivityLogEntry[];
}
