import Icon from '@/Components/Atoms/Icon/Icon';
import { ProjectOnboardingHeaderProps } from '@/types/Components';

export default function ProjectOnboardingHeader({
    userName,
}: ProjectOnboardingHeaderProps) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                    <Icon name="Sparkles" size={22} />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                        One last step
                    </p>
                    <h2 className="text-xl font-bold text-[var(--text-color)] sm:text-2xl">
                        Create your first project
                    </h2>
                </div>
            </div>

            <p className="-mt-2 text-sm leading-relaxed text-[var(--text-gray-color)]">
                Welcome aboard, {userName}. Every issue, sprint and teammate
                lives inside a project — let's spin up your workspace.
            </p>
        </div>
    );
}
