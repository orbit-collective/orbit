import { describe, expect, test } from 'vitest';
import {
    extractImageFiles,
    insertMarkdownImage,
    markdownImage,
    markdownImageAlt,
    nextImageRange,
    splitMarkdownImages,
} from './imagePaste';

const imageFile = (name = 'shot.png', type = 'image/png') =>
    new File(['x'], name, { type });

const dataTransfer = (
    files: File[],
    items: { kind: string; file: File | null }[] = [],
): DataTransfer =>
    ({
        files,
        items: items.map((item) => ({
            kind: item.kind,
            getAsFile: () => item.file,
        })),
    }) as unknown as DataTransfer;

describe('extractImageFiles', () => {
    test('returns an empty list when there is no payload', () => {
        expect(extractImageFiles(null)).toEqual([]);
        expect(extractImageFiles(undefined)).toEqual([]);
    });

    test('picks up dropped image files', () => {
        const file = imageFile();

        expect(extractImageFiles(dataTransfer([file]))).toEqual([file]);
    });

    test('picks up clipboard items that only expose the file through items', () => {
        const file = imageFile('screenshot.png');

        expect(
            extractImageFiles(dataTransfer([], [{ kind: 'file', file }])),
        ).toEqual([file]);
    });

    test('ignores non-image files and non-file items', () => {
        const pdf = new File(['x'], 'spec.pdf', { type: 'application/pdf' });

        expect(
            extractImageFiles(
                dataTransfer([pdf], [{ kind: 'string', file: null }]),
            ),
        ).toEqual([]);
    });

    test('does not return the same image twice when both files and items carry it', () => {
        const file = imageFile();
        // What a real paste looks like in a browser that populates both:
        // `getAsFile()` hands back a separate object for the same image.
        const sameImageAgain = imageFile();

        expect(
            extractImageFiles(
                dataTransfer([file], [{ kind: 'file', file: sameImageAgain }]),
            ),
        ).toEqual([file]);
    });

    test('falls back to items when files holds no image', () => {
        const pdf = new File(['x'], 'spec.pdf', { type: 'application/pdf' });
        const file = imageFile('screenshot.png');

        expect(
            extractImageFiles(dataTransfer([pdf], [{ kind: 'file', file }])),
        ).toEqual([file]);
    });

    test('returns every image of a genuine multi-file drop', () => {
        const first = imageFile('one.png');
        const second = imageFile('two.png');

        expect(extractImageFiles(dataTransfer([first, second]))).toEqual([
            first,
            second,
        ]);
    });
});

describe('splitMarkdownImages', () => {
    test('returns a single text segment for a body with no image', () => {
        expect(splitMarkdownImages('Looks good to me')).toEqual([
            { type: 'text', value: 'Looks good to me' },
        ]);
    });

    test('keeps an empty body as one empty text segment', () => {
        expect(splitMarkdownImages('')).toEqual([{ type: 'text', value: '' }]);
    });

    test('splits the text around an image link', () => {
        expect(
            splitMarkdownImages('Before ![shot.png](/storage/a.png) after'),
        ).toEqual([
            { type: 'text', value: 'Before ' },
            { type: 'image', value: 'shot.png', url: '/storage/a.png' },
            { type: 'text', value: ' after' },
        ]);
    });

    test('handles consecutive images and an empty alt text', () => {
        expect(
            splitMarkdownImages('![](/storage/a.png)![b](/storage/b.png)'),
        ).toEqual([
            { type: 'image', value: '', url: '/storage/a.png' },
            { type: 'image', value: 'b', url: '/storage/b.png' },
        ]);
    });

    test('leaves a plain markdown link alone', () => {
        const body = 'See [the docs](https://example.com) for details';

        expect(splitMarkdownImages(body)).toEqual([
            { type: 'text', value: body },
        ]);
    });

    test('leaves prose that merely contains brackets alone', () => {
        const body = 'Not an image! [see] (this) either';

        expect(splitMarkdownImages(body)).toEqual([
            { type: 'text', value: body },
        ]);
    });
});

describe('insertMarkdownImage', () => {
    const file = imageFile('shot.png');

    test('inserts at a collapsed caret and reports where it ends', () => {
        const result = insertMarkdownImage(
            'Before after',
            { start: 7, end: 7 },
            file,
            '/storage/a.png',
        );

        expect(result.body).toBe('Before ![shot.png](/storage/a.png)after');
        expect(result.length).toBe('![shot.png](/storage/a.png)'.length);
        expect(result.caret).toBe(7 + result.length);
    });

    test('replaces the selected range', () => {
        const result = insertMarkdownImage(
            'Replace me please',
            { start: 8, end: 10 },
            file,
            '/storage/a.png',
        );

        expect(result.body).toBe('Replace ![shot.png](/storage/a.png) please');
    });

    test('works on an empty body', () => {
        const result = insertMarkdownImage(
            '',
            { start: 0, end: 0 },
            file,
            '/storage/a.png',
        );

        expect(result.body).toBe('![shot.png](/storage/a.png)');
        expect(result.caret).toBe(result.body.length);
    });

    test('round-trips through splitMarkdownImages', () => {
        const { body } = insertMarkdownImage(
            'See: ',
            { start: 5, end: 5 },
            file,
            '/storage/a.png',
        );

        expect(splitMarkdownImages(body)).toEqual([
            { type: 'text', value: 'See: ' },
            { type: 'image', value: 'shot.png', url: '/storage/a.png' },
        ]);
    });
});

describe('nextImageRange', () => {
    const file = imageFile('shot.png');

    test('collapses to a point right after the image just inserted', () => {
        const range = { start: 4, end: 9 };
        const url = '/storage/a.png';

        const next = nextImageRange(range, file, url);
        const caret = 4 + markdownImage(file, url).length;

        expect(next).toEqual({ start: caret, end: caret });
    });

    test('agrees with the caret insertMarkdownImage reports', () => {
        const range = { start: 3, end: 3 };
        const url = '/storage/a.png';

        const result = insertMarkdownImage('Body', range, file, url);

        expect(nextImageRange(range, file, url).start).toBe(result.caret);
    });

    test('chaining it inserts a batch in order', () => {
        const first = imageFile('one.png');
        const second = imageFile('two.png');
        let body = 'Start ';
        let range = { start: 6, end: 6 };

        for (const [file, url] of [
            [first, '/storage/1.png'],
            [second, '/storage/2.png'],
        ] as const) {
            body = insertMarkdownImage(body, range, file, url).body;
            range = nextImageRange(range, file, url);
        }

        expect(body).toBe(
            'Start ![one.png](/storage/1.png)![two.png](/storage/2.png)',
        );
    });
});

describe('markdownImageAlt', () => {
    test('leaves an ordinary filename alone', () => {
        expect(markdownImageAlt('shot.png')).toBe('shot.png');
    });

    test('drops the characters that would close the link early', () => {
        expect(markdownImageAlt('screen](old).png')).toBe('screenold.png');
        expect(markdownImageAlt('back\\slash.png')).toBe('backslash.png');
    });

    test('collapses whitespace and newlines', () => {
        expect(markdownImageAlt(' two   words\n.png ')).toBe('two words .png');
    });

    test('falls back to a generic alt when nothing usable is left', () => {
        expect(markdownImageAlt('[]()')).toBe('image');
    });

    test('a hostile filename still produces a parseable image link', () => {
        const file = new File(['x'], 'screen](/evil.com).png', {
            type: 'image/png',
        });

        const { body } = insertMarkdownImage(
            '',
            { start: 0, end: 0 },
            file,
            '/storage/a.png',
        );

        expect(body).toBe('![screen/evil.com.png](/storage/a.png)');
        expect(splitMarkdownImages(body)).toEqual([
            {
                type: 'image',
                value: 'screen/evil.com.png',
                url: '/storage/a.png',
            },
        ]);
    });

    test('markdownImage builds the snippet from the sanitized alt', () => {
        const file = new File(['x'], 'a[b].png', { type: 'image/png' });

        expect(markdownImage(file, '/storage/a.png')).toBe(
            '![ab.png](/storage/a.png)',
        );
    });
});
