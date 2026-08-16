import { ModalContext } from '@/context/ModalContext';
import { ModalProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import React, { useContext, useEffect, useId } from 'react';

const panelVariants = cva(
    'relative w-full flex flex-col overflow-hidden rounded-2xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] shadow-2xl max-h-[85vh] [animation:modalSlideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]',
    {
        variants: {
            size: {
                sm: 'max-w-lg',
                md: 'max-w-3xl',
                lg: 'max-w-5xl',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    },
);

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    size = 'md',
}) => {
    const modalContext = useContext(ModalContext);
    const modalId = useId();

    const registerFn = modalContext?.registerExternalModal;
    const unregisterFn = modalContext?.unregisterExternalModal;

    useEffect(() => {
        if (!registerFn || !unregisterFn) return;

        if (isOpen) {
            registerFn(modalId);
        } else {
            unregisterFn(modalId);
        }

        return () => {
            unregisterFn(modalId);
        };
    }, [isOpen, modalId, registerFn, unregisterFn]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            <div
                className={
                    'fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--overlay-color)] p-4 backdrop-blur-sm [animation:modalFadeIn_0.2s_ease-out]'
                }
                onClick={onClose}
            >
                <div
                    className={cn(panelVariants({ size }))}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        </>
    );
};

export default Modal;
