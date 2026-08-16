export type NotificationTypes = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationTypes;
    title: string;
    message: string;
    read: boolean;
    action_url: string;
}

export interface NotificationSettings {
    [key: string]: {
        in_app: boolean;
        email: boolean;
    };
}
