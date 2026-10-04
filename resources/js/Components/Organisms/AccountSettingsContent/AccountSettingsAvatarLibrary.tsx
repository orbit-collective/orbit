import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { canvasesMatch, rasterizeImage } from '@/utils/faces';
import { useEffect, useState } from 'react';

const faceModules = import.meta.glob<string>('../../../assets/faces/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
});

const faces = Object.entries(faceModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => ({
        id: path.split('/').pop()!.replace('.svg', ''),
        src,
    }));

const faceCanvases = new Map<string, Promise<HTMLCanvasElement>>();

const getFaceCanvas = (src: string) => {
    if (!faceCanvases.has(src)) {
        const canvas = rasterizeImage(src);
        // Don't keep a failed load around, or matching could never recover.
        canvas.catch(() => faceCanvases.delete(src));
        faceCanvases.set(src, canvas);
    }

    return faceCanvases.get(src)!;
};

interface AccountSettingsAvatarLibraryProps {
    avatarSrc: string | null;
    disabled?: boolean;
    onSelect: (src: string) => void;
}

export default function AccountSettingsAvatarLibrary({
    avatarSrc,
    disabled = false,
    onSelect,
}: AccountSettingsAvatarLibraryProps) {
    const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

    // The server only stores the uploaded PNG, so work out which face (if any)
    // is the current avatar by comparing pixels.
    useEffect(() => {
        let cancelled = false;

        const findMatch = async () => {
            if (!avatarSrc) {
                return null;
            }

            const avatar = await rasterizeImage(avatarSrc);
            for (const face of faces) {
                // A face that fails to load must not hide a match further down.
                const canvas = await getFaceCanvas(face.src).catch(() => null);
                if (canvas && canvasesMatch(avatar, canvas)) {
                    return face.src;
                }
            }

            return null;
        };

        findMatch()
            .catch(() => null)
            .then((match) => {
                if (!cancelled) {
                    setSelectedSrc(match);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [avatarSrc]);

    return (
        <div
            role="group"
            aria-label="Avatar library"
            aria-busy={disabled}
            className="grid grid-cols-[repeat(auto-fill,minmax(3rem,3rem))] gap-2"
        >
            {faces.map((face) => {
                const selected = selectedSrc === face.src;

                return (
                    <button
                        key={face.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Use ${face.id} avatar`}
                        title={face.id}
                        disabled={disabled}
                        onClick={() => onSelect(face.src)}
                        className={cn(
                            'relative aspect-square rounded-full border p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-40',
                            selected
                                ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                : 'border-[var(--border-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color)]',
                        )}
                    >
                        <img
                            src={face.src}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                        />
                        {selected && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-color)] text-white">
                                <Icon name="Check" size={10} />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
