export const FACE_EXPORT_SIZE = 256;

// Mean per-channel difference (0-255) under which two rasterized avatars count as identical.
const MATCH_TOLERANCE = 2;

/**
 * Draws an image onto a square canvas. The source is fetched and loaded from a
 * blob URL: in dev the faces are served from the Vite origin, and drawing a
 * cross-origin image taints the canvas so reading it back throws. The faces
 * also only declare a viewBox, so the image gets explicit dimensions.
 */
export async function rasterizeImage(src: string): Promise<HTMLCanvasElement> {
    const response = await fetch(src);
    const objectUrl = URL.createObjectURL(await response.blob());
    const image = new Image(FACE_EXPORT_SIZE, FACE_EXPORT_SIZE);

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Image load failed'));
            image.src = objectUrl;
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }

    const canvas = document.createElement('canvas');
    canvas.width = FACE_EXPORT_SIZE;
    canvas.height = FACE_EXPORT_SIZE;
    canvas
        .getContext('2d')
        ?.drawImage(image, 0, 0, FACE_EXPORT_SIZE, FACE_EXPORT_SIZE);

    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error('Canvas export failed')),
            'image/png',
        ),
    );
}

const pixels = (canvas: HTMLCanvasElement) =>
    canvas
        .getContext('2d')
        ?.getImageData(0, 0, FACE_EXPORT_SIZE, FACE_EXPORT_SIZE).data;

export function canvasesMatch(
    a: HTMLCanvasElement,
    b: HTMLCanvasElement,
): boolean {
    const first = pixels(a);
    const second = pixels(b);
    if (!first || !second) {
        return false;
    }

    let total = 0;
    for (let i = 0; i < first.length; i++) {
        total += Math.abs(first[i] - second[i]);
    }

    return total / first.length < MATCH_TOLERANCE;
}
