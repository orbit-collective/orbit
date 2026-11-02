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
/**
 * A filename made safe to sit inside `![...]`.
 *
 * Alt text is cosmetic here - it is only ever the name of the uploaded file -
 * so the brackets, parentheses and backslashes that would close the markdown
 * link early are dropped rather than backslash-escaped: an escaped `\]` would
 * still have to be understood by both `tiptap-markdown` and
 * `splitMarkdownImages` to survive, and neither gains anything from carrying
 * it.
 */
export const markdownImageAlt = (name: string): string =>
    name
        .replace(/[[\]()\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'image';

/**
 * The markdown an uploaded image is represented by. Exported so a caller
 * inserting several images in a row can work out where the next one goes
 * without having to read the body back out of React state first.
 */
export const markdownImage = (file: File, url: string): string =>
    `![${markdownImageAlt(file.name)}](${url})`;

export const insertMarkdownImage = (
    body: string,
    range: { start: number; end: number },
    file: File,
    url: string,
): { body: string; caret: number; length: number } => {
    const snippet = markdownImage(file, url);

    return {
        body: body.slice(0, range.start) + snippet + body.slice(range.end),
        caret: range.start + snippet.length,
        length: snippet.length,
    };
};

/**
 * Where the next image of a batch has to land: a collapsed point right after
 * the one just inserted. Uploading a batch in parallel and reusing the
 * original range for every file inserts them in reverse order, and - when the
 * range covered a selection - lets a later insertion cut through the markdown
 * an earlier one already wrote.
 */
export const nextImageRange = (
    range: { start: number; end: number },
    file: File,
    url: string,
): { start: number; end: number } => {
    const caret = range.start + markdownImage(file, url).length;

    return { start: caret, end: caret };
};

export interface TextEdit {
    /** Where the replaced run starts, in the text before the edit. */
    start: number;
    /** Where the replaced run ends, in the text before the edit. */
    end: number;
    /** How many characters took its place. */
    insertedLength: number;
}

/**
 * The single edit that turns `prev` into `next`, found by trimming the common
 * prefix and suffix. A textarea reports no edit ranges of its own, and an
 * upload that is still in flight only needs to know how far text moved, so the
 * smallest enclosing replacement is enough.
 */
export const diffTextEdit = (prev: string, next: string): TextEdit => {
    const shortest = Math.min(prev.length, next.length);
    let start = 0;

    while (start < shortest && prev[start] === next[start]) start++;

    let suffix = 0;

    while (
        suffix < shortest - start &&
        prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) {
        suffix++;
    }

    return {
        start,
        end: prev.length - suffix,
        insertedLength: next.length - suffix - start,
    };
};

/**
 * Carries an offset through an edit. A point at the edit's start stays in
 * front of the new text unless `stickToEnd` is set, a point inside the
 * replaced run collapses onto the edit, and anything after it shifts.
 */
export const mapOffsetThroughEdit = (
    offset: number,
    edit: TextEdit,
    stickToEnd = false,
): number => {
    if (offset > edit.end || (offset === edit.end && edit.end > edit.start)) {
        return offset + edit.insertedLength - (edit.end - edit.start);
    }

    if (offset < edit.start) return offset;

    if (offset === edit.start && !stickToEnd) return offset;

    return edit.start + edit.insertedLength;
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
