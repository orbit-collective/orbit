import { AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useModal } from '@/context/ModalContext';
import { ModalOrg } from './Modal';

export const ModalContainer = () => {
    const { modals, closeModal } = useModal();

    // Prevent duplicate modals by ID
    const uniqueModals = useMemo(() => {
        const seen = new Set();
        return modals.filter((m) => {
            const duplicate = seen.has(m.id);
            seen.add(m.id);
            return !duplicate;
        });
    }, [modals]);

    return (
        <AnimatePresence>
            {uniqueModals.map((modal) => (
                <ModalOrg key={modal.id} modal={modal} onClose={closeModal} />
            ))}
        </AnimatePresence>
    );
};
