import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Modal from '@/Components/Atoms/Modal/Modal';
import { ModalContent } from '@/types/Modal';
import { cn } from '@/utils/cn';

interface ModalOrgProps {
    modal: ModalContent;
    onClose: (id: string) => void;
}

export const ModalOrg = ({ modal, onClose }: ModalOrgProps) => {
    const isShortcutModal = modal.title === 'Keyboard Shortcuts';

    return (
        <Modal isOpen={true} onClose={() => onClose(modal.id)} size="md">
            <div className="flex h-full flex-col overflow-y-auto">
                {!isShortcutModal && (
                    <div className="flex items-start justify-between border-b border-(--border-color) p-6">
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-(--text-color)">
                                {modal.title}
                            </h2>
                            {modal.description && (
                                <p className="mt-1 text-sm text-(--text-gray-color)">
                                    {modal.description}
                                </p>
                            )}
                        </div>
                        <IconButton
                            iconName={'X'}
                            onClick={() => onClose(modal.id)}
                            iconSize={20}
                        />
                    </div>
                )}
                <div
                    className={cn(
                        'flex-1 overflow-y-auto',
                        !isShortcutModal && 'p-6',
                    )}
                >
                    {modal.children}
                </div>
            </div>
        </Modal>
    );
};
