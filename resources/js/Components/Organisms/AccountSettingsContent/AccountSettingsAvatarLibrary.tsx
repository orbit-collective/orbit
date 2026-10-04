import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

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

interface AccountSettingsAvatarLibraryProps {
    selectedSrc: string | null;
    disabled?: boolean;
    onSelect: (src: string) => void;
}

export default function AccountSettingsAvatarLibrary({
    selectedSrc,
    disabled = false,
    onSelect,
}: AccountSettingsAvatarLibraryProps) {
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
