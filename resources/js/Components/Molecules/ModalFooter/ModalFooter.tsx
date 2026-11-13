import { useLaravelReactI18n } from 'laravel-react-i18n';
import React from 'react';
import Button from '@/Components/Atoms/Button/Button';
import { ModalFooterProps } from '@/types/Components';

const ModalFooter: React.FC<ModalFooterProps> = ({
    onCancel,
    submitLabel,
    cancelLabel,
    isSubmitting = false,
    children,
}) => {
    const { t } = useLaravelReactI18n();
    return (
        <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
            {children ?? (
                <>
                    <button
                        type="button"
                        className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                        onClick={onCancel}
                    >
                        {cancelLabel ?? t('modal_footer.cancel')}
                    </button>
                    <Button
                        type="submit"
                        isDisabled={isSubmitting}
                        className="rounded-lg px-6 py-2"
                    >
                        {isSubmitting
                            ? t('modal_footer.creating')
                            : (submitLabel ?? t('modal_footer.submit'))}
                    </Button>
                </>
            )}
        </footer>
    );
};

export default ModalFooter;
