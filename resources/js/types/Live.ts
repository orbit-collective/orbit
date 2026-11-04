export type LiveConfig =
    | { enabled: false }
    | {
          enabled: true;
          /** Public Reverb app key (never the secret). */
          key: string;
          host: string;
          port: number;
          scheme: 'http' | 'https';
      };

/** The enabled shape of `LiveConfig`, i.e. what Echo needs to connect. */
export type LiveConnection = Extract<LiveConfig, { enabled: true }>;

export type ProjectChangeAction = 'created' | 'updated' | 'deleted' | 'bulk';

/** One entry of a `project.changed` event; `id` is null for bulk changes. */
export interface ProjectChange {
    type: string;
    id: number | null;
    action: ProjectChangeAction;
}

export interface ProjectChangedPayload {
    changes: ProjectChange[];
    /** The user who made the change (null for the system). */
    actor: number | null;
}

export interface NotificationsChangedPayload {
    unread: number;
    created: {
        id: number;
        type: string;
        title: string;
        message: string;
        action_url: string | null;
    } | null;
}

export interface AccessChangedPayload {
    project: number | null;
}

/** Who is looking at the same thing, as shown by the presence stack. */
export interface PresenceUser {
    id: number;
    name: string;
    avatar: string | null;
}
