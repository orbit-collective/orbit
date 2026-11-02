import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { useImageInsertion } from './useImageInsertion';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

const deferred = () => {
    let resolve: (url: string) => void = () => {};
    const promise = new Promise<string>((r) => {
        resolve = r;
    });

    return { promise, resolve };
};

const setup = (initial: string) =>
    renderHook(() => {
        const [value, setValue] = useState(initial);

        return { value, setValue, ...useImageInsertion(value, setValue) };
    });

describe('useImageInsertion', () => {
    test('inserts at the pasted point when nothing changed', async () => {
        const { result } = setup('ab');

        await act(() =>
            result.current.insertImages(
                [file('a.png')],
                { start: 1, end: 1 },
                async () => '/a.png',
            ),
        );

        expect(result.current.value).toBe('a![a.png](/a.png)b');
    });

    test('follows text typed in front of the point during the upload', async () => {
        const { result } = setup('ab');
        const upload = deferred();
        let done: Promise<void> = Promise.resolve();

        act(() => {
            done = result.current.insertImages(
                [file('a.png')],
                { start: 1, end: 1 },
                () => upload.promise,
            );
        });
        act(() => result.current.setValue('XXab'));
        await act(async () => {
            upload.resolve('/a.png');
            await done;
        });

        expect(result.current.value).toBe('XXa![a.png](/a.png)b');
    });

    test('keeps two concurrent pastes at the same point in order', async () => {
        const { result } = setup('ab');
        const first = deferred();
        const second = deferred();
        let done: Promise<unknown> = Promise.resolve();

        act(() => {
            done = Promise.all([
                result.current.insertImages(
                    [file('1.png')],
                    { start: 1, end: 1 },
                    () => first.promise,
                ),
                result.current.insertImages(
                    [file('2.png')],
                    { start: 1, end: 1 },
                    () => second.promise,
                ),
            ]);
        });
        await act(async () => {
            first.resolve('/1.png');
            second.resolve('/2.png');
            await done;
        });

        expect(result.current.value).toBe('a![1.png](/1.png)![2.png](/2.png)b');
    });

    test('reports the edit it made and skips a failed upload', async () => {
        const { result } = setup('ab');
        const edits: unknown[] = [];

        await act(() =>
            result.current.insertImages(
                [file('bad.png'), file('a.png')],
                { start: 1, end: 1 },
                async (f) => {
                    if (f.name === 'bad.png') throw new Error('nope');

                    return '/a.png';
                },
                ({ edit }) => edits.push(edit),
            ),
        );

        expect(edits).toEqual([{ start: 1, end: 1, insertedLength: 16 }]);
        expect(result.current.value).toBe('a![a.png](/a.png)b');
    });

    test('keeps text typed over a selection that an image was pasted onto', async () => {
        const { result } = setup('abcd');
        const upload = deferred();
        let done: Promise<void> = Promise.resolve();

        act(() => {
            done = result.current.insertImages(
                [file('a.png')],
                { start: 1, end: 3 },
                () => upload.promise,
            );
        });
        act(() => result.current.setValue('aXd'));
        await act(async () => {
            upload.resolve('/a.png');
            await done;
        });

        expect(result.current.value).toBe('aX![a.png](/a.png)d');
    });

    test('typing a character that also ends the selection does not make the image delete text', async () => {
        // "fo" of "foo" is selected and typed over with "f": the value diff
        // alone cannot tell which characters were replaced.
        // The caret the keystroke left behind, as the textarea would report it.
        const textarea = { selectionStart: 1, selectionEnd: 1 };
        const { result } = renderHook(() => {
            const [value, setValue] = useState('foo');

            return {
                value,
                setValue,
                ...useImageInsertion(value, setValue, {
                    current: textarea,
                } as never),
            };
        });
        const upload = deferred();
        let done: Promise<void> = Promise.resolve();

        act(() => {
            done = result.current.insertImages(
                [file('a.png')],
                { start: 0, end: 2 },
                () => upload.promise,
            );
        });
        act(() => result.current.setValue('fo'));
        await act(async () => {
            upload.resolve('/a.png');
            await done;
        });

        expect(result.current.value).toBe('f![a.png](/a.png)o');
    });

    test('two pastes at one caret keep paste order when the second upload finishes first', async () => {
        const { result } = setup('ab');
        const first = deferred();
        const second = deferred();
        let done: Promise<unknown> = Promise.resolve();

        act(() => {
            done = Promise.all([
                result.current.insertImages(
                    [file('1.png')],
                    { start: 1, end: 1 },
                    () => first.promise,
                ),
                result.current.insertImages(
                    [file('2.png')],
                    { start: 1, end: 1 },
                    () => second.promise,
                ),
            ]);
        });
        await act(async () => {
            second.resolve('/2.png');
            await Promise.resolve();
        });
        await act(async () => {
            first.resolve('/1.png');
            await done;
        });

        expect(result.current.value).toBe('a![1.png](/1.png)![2.png](/2.png)b');
    });
});
