import Button from '@/Components/Atoms/Button/Button';
import { ModalFooterProps } from '@/types/Components';
import React from 'react';

const ModalFooter: React.FC<ModalFooterProps> = ({
    onCancel,
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    isSubmitting = false,
    children,
}) => {
    return (
        <footer className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
            {children ?? (
                <>
                    <button
                        type="button"
                        className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <Button
                        type="submit"
                        isDisabled={isSubmitting}
                        className="rounded-lg px-6 py-2"
                    >
                        {isSubmitting ? 'Creating...' : submitLabel}
                    </Button>
                </>
            )}
        </footer>
    );
};

export default ModalFooter;
