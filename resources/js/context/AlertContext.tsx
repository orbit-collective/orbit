import { AlertContainer } from '@/Components/Organisms/AlertContainer/AlertContainer';
import {
    AlertContextType,
    AlertItem,
    AlertType,
    InertiaPageProps,
} from '@/types/Alert';
import { router, usePage } from '@inertiajs/react';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    const addAlert = useCallback(
        (
            message: string,
            type: AlertType = 'success',
            duration = 4000,
            actionUrl?: string,
        ) => {
            const id = Math.random().toString(36).substring(2, 9);

            setAlerts((prev) => [...prev, { id, message, type, actionUrl }]);

            if (duration) {
                setTimeout(() => {
                    removeAlert(id);
                }, duration);
            }
        },
        [],
    );

    const removeAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, []);

    const showFlashAlerts = useCallback(
        (flash: InertiaPageProps['flash'] | undefined) => {
            if (flash?.success) {
                addAlert(flash.success, 'success', 4000, flash.action_url);
            }
            if (flash?.error) {
                addAlert(flash.error, 'error', 4000, flash.action_url);
            }
            if (flash?.warning) {
                addAlert(flash.warning, 'warning', 4000, flash.action_url);
            }
            if (flash?.information) {
                addAlert(
                    flash.information,
                    'information',
                    4000,
                    flash.action_url,
                );
            }
        },
        [addAlert],
    );

    // Covers flash data present on the very first, server-rendered page load
    // (there's no Inertia "visit" to hook into yet at that point).
    const { flash: initialFlash } = usePage<InertiaPageProps>().props;
    const hasShownInitialFlash = useRef(false);
    useEffect(() => {
        if (hasShownInitialFlash.current) {
            return;
        }
        hasShownInitialFlash.current = true;
        showFlashAlerts(initialFlash);
    }, []);

    // Covers every subsequent visit (router.get/post/patch/delete/...). This
    // has to be an Inertia router event rather than a `usePage()`-driven
    // effect: Inertia reuses the same `flash` object reference across visits
    // whose flash content is identical (e.g. two authorization failures in a
    // row both flashing "This action is unauthorized."), which means a
    // `useEffect` keyed on that object would never re-run for the second one
    // — the router's own "success" event fires unconditionally on every
    // completed visit instead, regardless of whether the flash content
    // repeats.
    useEffect(() => {
        return router.on('success', (event) => {
            const flash = (
                event.detail.page.props as unknown as InertiaPageProps
            ).flash;
            showFlashAlerts(flash);
        });
    }, [showFlashAlerts]);

    return (
        <AlertContext.Provider value={{ addAlert, removeAlert, alerts }}>
            {children}
            <AlertContainer alerts={alerts} removeAlert={removeAlert} />
        </AlertContext.Provider>
    );
};

export const useAlert = (): AlertContextType => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
