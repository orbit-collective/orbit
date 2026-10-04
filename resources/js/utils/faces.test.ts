import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    FACE_EXPORT_SIZE,
    canvasToBlob,
    canvasesMatch,
    rasterizeImage,
} from './faces';

const PIXEL_COUNT = FACE_EXPORT_SIZE * FACE_EXPORT_SIZE * 4;

const fakeCanvas = (fill: number, changed = 0, changedValue = 255) => {
    const data = new Uint8ClampedArray(PIXEL_COUNT).fill(fill);
    for (let i = 0; i < changed; i++) {
        data[i] = changedValue;
    }

    return {
        getContext: () => ({ getImageData: () => ({ data }) }),
    } as unknown as HTMLCanvasElement;
};

describe('canvasesMatch', () => {
    test('matches identical pixels', () => {
        expect(canvasesMatch(fakeCanvas(10), fakeCanvas(10))).toBe(true);
    });

    test('tolerates tiny rendering differences', () => {
        // One channel of every 100th pixel differs by 100: mean diff well under 2.
        expect(canvasesMatch(fakeCanvas(0), fakeCanvas(0, 2000, 100))).toBe(
            true,
        );
    });

    test('rejects clearly different images', () => {
        expect(canvasesMatch(fakeCanvas(0), fakeCanvas(0, PIXEL_COUNT))).toBe(
            false,
        );
    });

    test('does not match when a canvas has no 2d context', () => {
        const noContext = {
            getContext: () => null,
        } as unknown as HTMLCanvasElement;

        expect(canvasesMatch(noContext, fakeCanvas(0))).toBe(false);
    });
});

describe('canvasToBlob', () => {
    test('resolves with the exported PNG blob', async () => {
        const blob = new Blob(['png']);
        const canvas = {
            toBlob: (cb: BlobCallback, type: string) => {
                expect(type).toBe('image/png');
                cb(blob);
            },
        } as unknown as HTMLCanvasElement;

        await expect(canvasToBlob(canvas)).resolves.toBe(blob);
    });

    test('rejects when the canvas cannot be exported', async () => {
        const canvas = {
            toBlob: (cb: BlobCallback) => cb(null),
        } as unknown as HTMLCanvasElement;

        await expect(canvasToBlob(canvas)).rejects.toThrow(
            'Canvas export failed',
        );
    });
});

describe('rasterizeImage', () => {
    const drawImage = vi.fn();
    let imageShouldFail = false;
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
        imageShouldFail = false;
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ blob: async () => new Blob(['svg']) }),
        );
        URL.createObjectURL = vi.fn(() => 'blob:face');
        URL.revokeObjectURL = revokeObjectURL;

        class FakeImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            constructor(
                public width: number,
                public height: number,
            ) {}
            set src(_value: string) {
                queueMicrotask(() =>
                    imageShouldFail ? this.onerror?.() : this.onload?.(),
                );
            }
        }
        vi.stubGlobal('Image', FakeImage);

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage,
        } as unknown as CanvasRenderingContext2D);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    test('draws the image onto a square export-sized canvas', async () => {
        const canvas = await rasterizeImage('/faces/a.svg');

        expect(canvas.width).toBe(FACE_EXPORT_SIZE);
        expect(canvas.height).toBe(FACE_EXPORT_SIZE);
        expect(drawImage).toHaveBeenCalledWith(
            expect.anything(),
            0,
            0,
            FACE_EXPORT_SIZE,
            FACE_EXPORT_SIZE,
        );
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:face');
    });

    test('rejects and still revokes the blob URL when the image fails', async () => {
        imageShouldFail = true;

        await expect(rasterizeImage('/faces/a.svg')).rejects.toThrow(
            'Image load failed',
        );
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:face');
    });
});
