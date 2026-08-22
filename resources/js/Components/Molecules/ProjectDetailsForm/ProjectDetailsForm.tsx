import Input from '@/Components/Atoms/Input/Input';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { ProjectDetails } from '@/types/ProjectMembers';
import { AVAILABLE_COLORS } from '@/types/Projects';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { SyntheticEvent } from 'react';

interface ProjectDetailsFormProps {
    draft: ProjectDetails;
    isSaving: boolean;
    onChange: (draft: ProjectDetails) => void;
    onSubmit: (event: SyntheticEvent) => void;
}

export default function ProjectDetailsForm({
    draft,
    isSaving,
    onChange,
    onSubmit,
}: ProjectDetailsFormProps) {
    return (
        <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 px-4 py-4 sm:px-5"
        >
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Name
                </label>
                <Input
                    value={draft.name}
                    onChange={(event) =>
                        onChange({ ...draft, name: event.target.value })
                    }
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Description
                </label>
                <TextArea
                    value={draft.description ?? ''}
                    onChange={(event) =>
                        onChange({ ...draft, description: event.target.value })
                    }
                    placeholder="What is this project about?"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Color
                </label>
                <div className="flex flex-wrap gap-3">
                    {AVAILABLE_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onChange({ ...draft, color })}
                            aria-label={`Select ${color} color`}
                            className={cn(
                                'h-6 w-6 rounded-full border border-solid transition-transform',
                                getColorTheme(color).accent,
                                draft.color === color
                                    ? 'scale-110 border-white'
                                    : 'border-transparent hover:scale-110',
                            )}
                        />
                    ))}
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--accent-color)] px-4 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isSaving ? 'Saving...' : 'Save changes'}
                </button>
            </div>
        </form>
    );
}
