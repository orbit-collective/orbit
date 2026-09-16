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

/**
 * Splices a markdown image link into a textarea's value, replacing whatever
 * the given range covers, and reports where the caret has to be restored -
 * a textarea drops its selection as soon as React re-renders it with a new
 * value.
 */
export const insertMarkdownImage = (
    body: string,
    range: { start: number; end: number },
    file: File,
    url: string,
): { body: string; caret: number; length: number } => {
    const snippet = `![${file.name}](${url})`;

    return {
        body: body.slice(0, range.start) + snippet + body.slice(range.end),
        caret: range.start + snippet.length,
        length: snippet.length,
    };
};

export interface MarkdownImageSegment {
    type: 'text' | 'image';
    /** The raw text, or - for an image - its alt text. */
    value: string;
    url?: string;
}

// Deliberately narrow: no whitespace in the URL and no nested brackets in the
// alt text, so a line of prose that merely contains brackets and parentheses
// is never mistaken for an image.
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * Splits a markdown body into plain-text runs and the image links between
 * them, so a renderer can turn `![alt](url)` into an actual `<img>` while
 * leaving everything else (mentions included) to the existing text handling.
 */
export const splitMarkdownImages = (body: string): MarkdownImageSegment[] => {
    if (!body) return [{ type: 'text', value: body }];

    const segments: MarkdownImageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MARKDOWN_IMAGE_PATTERN.lastIndex = 0;
    while ((match = MARKDOWN_IMAGE_PATTERN.exec(body)) !== null) {
        const [full, alt, url] = match;

        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }

        segments.push({ type: 'image', value: alt, url });

        lastIndex = match.index + full.length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    return segments;
};
