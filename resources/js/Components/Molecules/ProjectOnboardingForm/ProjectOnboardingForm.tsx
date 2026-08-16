import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { ProjectOnboardingFormProps } from '@/types/Components';
import { AVAILABLE_COLORS } from '@/types/Projects';
import { getColorTheme } from '@/utils/colors';

export default function ProjectOnboardingForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    onSkip,
}: ProjectOnboardingFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Project name
                    <span className="text-[var(--error-color)]"> *</span>
                </label>
                <Input
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="e.g. Mobile App Revamp"
                    variant="modal"
                />
                {errors.name && (
                    <span className="text-xs text-[var(--error-color)]">
                        {errors.name}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Slug
                    <span className="text-[var(--error-color)]"> *</span>
                </label>
                <Input
                    value={data.slug}
                    onChange={(e) => setData('slug', e.target.value)}
                    placeholder="e.g. MOB"
                    variant="modal"
                />
                {errors.slug && (
                    <span className="text-xs text-[var(--error-color)]">
                        {errors.slug}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]">
                    Description
                </label>
                <TextArea
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="What is this project about?"
                    variant="modal"
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
                            onClick={() => setData('color', color)}
                            aria-label={`Select ${color} color`}
                            className={`h-6 w-6 rounded-full border border-solid transition-transform ${getColorTheme(color).accent} ${
                                data.color === color
                                    ? 'scale-110 border-white'
                                    : 'border-transparent hover:scale-110'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-[var(--border-color-strong)] pt-6">
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={processing}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-2 py-2 text-sm font-medium text-[var(--text-muted-color)] transition-colors duration-150 hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    I'll do this later
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all duration-150 ease-in-out hover:scale-[1.02] hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                    {processing ? 'Creating...' : 'Create project'}
                    {!processing && <Icon name="ArrowRight" size={16} />}
                </button>
            </div>
        </form>
    );
}
