import { useCallback, useEffect, useRef } from 'react';
import {
    diffTextEdit,
    insertMarkdownImage,
    mapPendingRange,
    nextImageRange,
    TextEdit,
} from '@/utils/imagePaste';

type Range = { start: number; end: number };

interface InsertedImage {
    /** The edit the splice made, for surfaces tracking ranges of their own. */
    edit: TextEdit;
    caret: number;
}

/**
 * Splices uploaded images into a textarea's value at the point they were
 * pasted or dropped, however long the upload took.
 *
 * Every insertion point still waiting on an upload is kept as a live range:
 * edits made meanwhile (typing, another paste, another image landing) are
 * diffed out of `value` and carried through it, so an image is spliced where
 * its text now is rather than at the offset captured back then. Splicing
 * itself is synchronous against a ref holding the latest value, which is what
 * keeps two uploads that resolve back to back from overwriting each other.
 */
export const useImageInsertion = (
    value: string,
    setValue: (next: string) => void,
) => {
    const valueRef = useRef(value);
    const pendingRef = useRef(new Set<Range>());

    useEffect(() => {
        if (valueRef.current === value) return;

        const edit = diffTextEdit(valueRef.current, value);

        for (const range of pendingRef.current) {
            Object.assign(range, mapPendingRange(range, edit));
        }

        valueRef.current = value;
    }, [value]);

    /**
     * Uploads a batch one at a time, inserting each image as soon as its URL
     * comes back and moving the insertion point past it so the batch keeps
     * its order. A failed upload is skipped; the uploader already told the
     * user about it.
     */
    const insertImages = useCallback(
        async (
            files: File[],
            at: Range,
            upload: (file: File) => Promise<string>,
            onInserted?: (result: InsertedImage) => void,
        ) => {
            const pending: Range = { ...at };

            pendingRef.current.add(pending);

            try {
                for (const file of files) {
                    try {
                        const url = await upload(file);

                        // Re-read after the await: this is the text as it
                        // stands now, and `pending` has been mapped through
                        // every edit since the paste.
                        const result = insertMarkdownImage(
                            valueRef.current,
                            pending,
                            file,
                            url,
                        );
                        const edit: TextEdit = {
                            start: pending.start,
                            end: pending.end,
                            insertedLength: result.length,
                        };

                        for (const other of pendingRef.current) {
                            if (other === pending) continue;

                            Object.assign(
                                other,
                                mapPendingRange(other, edit, true),
                            );
                        }

                        Object.assign(
                            pending,
                            nextImageRange(pending, file, url),
                        );

                        valueRef.current = result.body;
                        setValue(result.body);
                        onInserted?.({ edit, caret: result.caret });
                    } catch {
                        // Skipped: see above.
                    }
                }
            } finally {
                pendingRef.current.delete(pending);
            }
        },
        [setValue],
    );

    return { insertImages };
};
