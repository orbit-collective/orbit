import { ProgressBarProps } from '@/types/Components';

export default function ProgressBar({
    currentStep,
    totalSteps,
}: ProgressBarProps) {
    const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

    return (
        <div className="flex items-center gap-4">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--surface-color)]">
                <div
                    className="h-full bg-violet-600 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
            <span className="text-xs font-medium text-[var(--text-gray-color)]">
                {currentStep + 1}/{totalSteps}
            </span>
        </div>
    );
}
