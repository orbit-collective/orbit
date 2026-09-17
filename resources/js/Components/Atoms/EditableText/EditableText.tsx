import Input from '@/Components/Atoms/Input/Input';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { EditableTextProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import {
    extractImageFiles,
    insertMarkdownImage,
    nextImageRange,
} from '@/utils/imagePaste';
import React, { useEffect, useRef, useState } from 'react';

const EditableText: React.FC<EditableTextProps> = ({
    value,
    onSave,
    placeholder,
    emptyText = 'No content',
    multiline = false,
    as: Tag = 'div',
    displayClassName,
    inputClassName,
    disabled = false,
    renderDisplay,
    onImageUpload,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [pendingCaret, setPendingCaret] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Read by commit(), which fires on blur: losing focus mid-upload must not
    // end the edit, or the image would be spliced into a draft that is no
    // longer on screen and never saved.
    const pendingUploadsRef = useRef(0);

    useEffect(() => {
        if (!isEditing) return;

        const el = multiline ? textareaRef.current : inputRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
    }, [isEditing, multiline]);

    useEffect(() => {
        if (pendingCaret === null || !textareaRef.current) return;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pendingCaret, pendingCaret);
        setPendingCaret(null);
    }, [draft, pendingCaret]);

    const startEditing = () => {
        if (disabled) return;
        setDraft(value);
        setIsEditing(true);
    };

    const commit = () => {
        if (pendingUploadsRef.current > 0) return;

        setIsEditing(false);
        if (draft !== value) {
            onSave(draft);
        }
    };

    /**
     * Uploads a batch one at a time and moves the insertion point past each
     * image as it lands, so several files pasted at once keep their order
     * instead of every one of them splicing into the original range.
     */
    const insertImages = async (
        files: File[],
        range: { start: number; end: number },
    ) => {
        if (!onImageUpload) return;

        pendingUploadsRef.current += files.length;

        let target = range;

        for (const file of files) {
            const at = target;

            try {
                const url = await onImageUpload(file);

                setDraft((current) => {
                    const result = insertMarkdownImage(current, at, file, url);

                    setPendingCaret(result.caret);

                    return result.body;
                });

                target = nextImageRange(at, file, url);
            } catch {
                // The uploader already reported the failure to the user.
            } finally {
                pendingUploadsRef.current = Math.max(
                    0,
                    pendingUploadsRef.current - 1,
                );
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const files = extractImageFiles(e.clipboardData);

        if (!onImageUpload || files.length === 0) return;

        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } = e.currentTarget;

        void insertImages(files, { start, end });
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        const files = extractImageFiles(e.dataTransfer);

        if (!onImageUpload || files.length === 0) return;

        e.preventDefault();

        const caret = e.currentTarget.selectionStart;

        void insertImages(files, { start: caret, end: caret });
    };

    const cancel = () => {
        setDraft(value);
        setIsEditing(false);
    };

    if (isEditing) {
        if (multiline) {
            return (
                <TextArea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    className={inputClassName}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            cancel();
                        }
                    }}
                />
            );
        }

        return (
            <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                className={inputClassName}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancel();
                    }
                }}
            />
        );
    }

    return (
        <Tag
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={startEditing}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    startEditing();
                }
            }}
            className={cn(!disabled && 'cursor-text', displayClassName)}
        >
            {value ? (
                renderDisplay ? (
                    renderDisplay(value)
                ) : (
                    value
                )
            ) : (
                <span className="italic text-[var(--text-gray-color)]">
                    {placeholder || emptyText}
                </span>
            )}
        </Tag>
    );
};

export default EditableText;
