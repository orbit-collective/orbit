import { PageProps } from '@/types/index';

export type AlertType = 'success' | 'error' | 'warning' | 'information';

export interface AlertItem {
    id: string;
    message: string;
    type: AlertType;
    actionUrl?: string;
}
export interface InertiaPageProps extends PageProps {
    flash: {
        success?: string;
        error?: string;
        warning?: string;
        information?: string;
        action_url?: string;
    };
}

export interface AlertContextType {
    /** Returns the new alert's id, so a caller that needs to update or remove it later (e.g. a live progress toast) can do so. */
    addAlert: (
        message: string,
        type?: AlertType,
        duration?: number,
        actionUrl?: string,
    ) => string;
    /** Patches an existing alert in place (e.g. to update a live progress toast's message) - does nothing if the id is no longer present (already dismissed/removed). */
    updateAlert: (
        id: string,
        patch: Partial<Pick<AlertItem, 'message' | 'type' | 'actionUrl'>>,
    ) => void;
    removeAlert: (id: string) => void;
    alerts: AlertItem[];
}
