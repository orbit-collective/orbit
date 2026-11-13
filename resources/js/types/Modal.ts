import { ReactNode } from 'react';

export interface ModalContent {
    id: string;
    title: string;
    description?: string;
    children: ReactNode;
    /** Renders the content without the title/description header and body padding. */
    bare?: boolean;
}

export interface ModalContextType {
    modals: ModalContent[];
    openModal: (
        title: string,
        description: string | undefined,
        children: ReactNode,
        bare?: boolean,
    ) => string;
    closeModal: (id: string) => void;
    closeAllModals: () => void;
    getIfAnyModalIsOpened: () => boolean;
    registerExternalModal: (id: string) => void;
    unregisterExternalModal: (id: string) => void;
}
