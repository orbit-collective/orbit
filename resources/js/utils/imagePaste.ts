/**
 * Pulls the image files out of a paste or drop payload.
 *
 * `files` is preferred and `items` is only consulted when it yields nothing:
 * a pasted screenshot is exposed through `items` alone in some browsers, but
 * in the ones that populate both, the very same image arrives twice - and the
 * two File objects can't be compared for identity (`getAsFile()` hands back a
 * fresh object, with its own `lastModified`), so the duplicate has to be
 * avoided rather than filtered out afterwards.
 */
export const extractImageFiles = (
    data: DataTransfer | null | undefined,
): File[] => {
    if (!data) return [];

    const isImage = (file: File) => file.type.startsWith('image/');

    const fromFiles = Array.from(data.files ?? []).filter(isImage);

    if (fromFiles.length > 0) return fromFiles;

    return Array.from(data.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null && isImage(file));
};
