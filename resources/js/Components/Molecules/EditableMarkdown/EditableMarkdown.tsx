import { EditableMarkdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { extractImageFiles } from '@/utils/imagePaste';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useRef, useState } from 'react';
import { Markdown } from 'tiptap-markdown';

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    onImageUpload,
    placeholder = 'Add a description...',
    disabled = false,
    className,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [pendingUploads, setPendingUploads] = useState(0);
    // Read inside commit(), which runs from Tiptap's onBlur handler: blurring
    // mid-upload must not end the editing session, or the image would be
    // inserted into an editor that is no longer editable and never saved.
    const pendingUploadsRef = useRef(0);

    const editor = useEditor({
        editable: false,
        content: value || '',
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
            }),
            Markdown.configure({ html: false }),
            Placeholder.configure({
                placeholder,
                showOnlyWhenEditable: false,
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
            Image,
        ],
        editorProps: {
            attributes: {
                class: 'prose max-w-none text-sm focus:outline-none',
            },
            handlePaste: (_view, event) => {
                const files = extractImageFiles(event.clipboardData);

                if (!canUploadImages() || files.length === 0) return false;

                event.preventDefault();
                void insertImages(files);

                return true;
            },
        },
        onBlur: ({ editor }) => commit(editor),
    });

    useEffect(() => {
        if (!editor || isEditing) return;

        const current = editor.storage.markdown.getMarkdown();
        if (current !== (value || '')) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    const canUploadImages = () => Boolean(onImageUpload) && !disabled;

    /**
     * Uploads sequentially and inserts each image as soon as its URL comes
     * back, so a multi-image paste doesn't wait for the slowest file - the
     * position is re-read from the live document every time rather than
     * pre-computed, because earlier insertions have already shifted it.
     */
    const insertImages = async (files: File[], at?: number) => {
        if (!editor || !onImageUpload) return;

        setPendingUploads((count) => count + files.length);
        pendingUploadsRef.current += files.length;

        let position = at;

        for (const file of files) {
            try {
                const url = await onImageUpload(file);

                const target = Math.min(
                    position ?? editor.state.selection.to,
                    editor.state.doc.content.size,
                );

                editor
                    .chain()
                    .focus()
                    .insertContentAt(target, {
                        type: 'image',
                        attrs: { src: url, alt: file.name },
                    })
                    .run();

                if (position !== undefined) {
                    position = editor.state.selection.to;
                }
            } catch {
                // The uploader already reported the failure to the user; the
                // remaining files in this batch still get their turn.
            } finally {
                setPendingUploads((count) => Math.max(0, count - 1));
                pendingUploadsRef.current = Math.max(
                    0,
                    pendingUploadsRef.current - 1,
                );
            }
        }
    };

    const commit = (ed: NonNullable<typeof editor>) => {
        if (pendingUploadsRef.current > 0) return;

        setIsEditing(false);
        ed.setEditable(false);

        const markdown = ed.storage.markdown.getMarkdown();
        if (markdown !== (value || '')) {
            onSave(markdown);
        }
    };

    const cancel = () => {
        if (!editor || pendingUploadsRef.current > 0) return;

        editor.commands.setContent(value || '');
        editor.setEditable(false);
        setIsEditing(false);
    };

    const startEditing = () => {
        if (disabled || !editor || isEditing) return;

        editor.setEditable(true);
        setIsEditing(true);
        editor.commands.focus('end');
    };

    /**
     * Drop is handled on the wrapper rather than through Tiptap's
     * `handleDrop`, because a file can be dropped onto the rendered
     * (non-editable) description too - that has to open the editor first.
     */
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        setIsDraggingOver(false);

        const files = extractImageFiles(event.dataTransfer);

        if (!canUploadImages() || files.length === 0) return;

        event.preventDefault();

        startEditing();

        const droppedAt = editor?.view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
        })?.pos;

        void insertImages(files, droppedAt);
    };

    return (
        <div
            onClick={startEditing}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            onDragOver={(e) => {
                if (!canUploadImages()) return;

                e.preventDefault();
                setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={cn(
                !disabled && !isEditing && 'cursor-text',
                isDraggingOver &&
                    'rounded-lg ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--bg-color)]',
                className,
            )}
        >
            <EditorContent editor={editor} />
            {pendingUploads > 0 && (
                <span className="mt-1 block text-xs text-[var(--text-gray-color)]">
                    Uploading {pendingUploads}{' '}
                    {pendingUploads === 1 ? 'image' : 'images'}...
                </span>
            )}
        </div>
    );
};

export default EditableMarkdown;
