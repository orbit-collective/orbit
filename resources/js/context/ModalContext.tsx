import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useState,
} from 'react';
import { ModalContent, ModalContextType } from '@/types/Modal';

export const ModalContext = createContext<ModalContextType | undefined>(
    undefined,
);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [modals, setModals] = useState<ModalContent[]>([]);
    const [externalModals, setExternalModals] = useState<Set<string>>(
        new Set(),
    );

    const openModal = useCallback(
        (
            title: string,
            description: string | undefined,
            children: ReactNode,
        ) => {
            const id = Math.random().toString(36).substring(2, 9);

            setModals((prev) => [
                ...prev,
                { id, title, description, children },
            ]);

            return id;
        },
        [],
    );

    const closeModal = useCallback((id: string) => {
        setModals((prev) => prev.filter((modal) => modal.id !== id));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals([]);
        setExternalModals(new Set());
    }, []);

    const registerExternalModal = useCallback((id: string) => {
        setExternalModals((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const unregisterExternalModal = useCallback((id: string) => {
        setExternalModals((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const getIfAnyModalIsOpened = useCallback(() => {
        return modals.length > 0 || externalModals.size > 0;
    }, [modals, externalModals]);

    return (
        <ModalContext.Provider
            value={{
                modals,
                openModal,
                closeModal,
                closeAllModals,
                getIfAnyModalIsOpened,
                registerExternalModal,
                unregisterExternalModal,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = (): ModalContextType => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
