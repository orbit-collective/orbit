export type NotificationTypes = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationTypes;
    title: string;
    message: string;
    read: boolean;
    action_url: string;
    created_at: string;
}

export type NotificationFilter = 'all' | NotificationTypes;

/** One page of `GET /notifications` (keyset-paginated, newest first). */
export interface NotificationPage {
    data: Notification[];
    /** The id to send back as `before` for the next page; null when exhausted. */
    next_cursor: number | null;
    unread_count: number;
}

export interface NotificationQuery {
    onlyUnread: boolean;
    type: NotificationFilter;
}

export type RetentionFrequency = 'daily' | 'weekly' | 'monthly';

/** The user's automatic clean-up schedule (Settings > Notifications). */
export interface NotificationRetention {
    enabled: boolean;
    frequency: RetentionFrequency;
    notifications_older_than_days: number | null;
    notifications_only_read: boolean;
    activity_older_than_days: number | null;
    last_run_at: string | null;
}

export interface NotificationSettings {
    [key: string]: {
        in_app: boolean;
        email: boolean;
    };
}
