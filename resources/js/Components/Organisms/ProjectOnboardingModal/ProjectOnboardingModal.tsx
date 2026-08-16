import BackdropBlur from '@/Components/Atoms/BackdropBlur/BackdropBlur';
import ProjectOnboardingForm from '@/Components/Molecules/ProjectOnboardingForm/ProjectOnboardingForm';
import ProjectOnboardingHeader from '@/Components/Molecules/ProjectOnboardingHeader/ProjectOnboardingHeader';
import ProjectOnboardingPreview from '@/Components/Molecules/ProjectOnboardingPreview/ProjectOnboardingPreview';
import { ProjectOnboardingModalProps } from '@/types/Components';
import { AVAILABLE_COLORS } from '@/types/Projects';
import { getColorTheme } from '@/utils/colors';
import { useForm } from '@inertiajs/react';
import { SyntheticEvent } from 'react';

export default function ProjectOnboardingModal({
    userName,
    onSkip,
}: ProjectOnboardingModalProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        description: '',
        color: AVAILABLE_COLORS[0],
    });

    const theme = getColorTheme(data.color);

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('projects.store'));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <BackdropBlur intensity="md" />

            <div className="relative z-50 w-full max-w-4xl">
                <div
                    className={`pointer-events-none absolute -inset-16 rounded-[80px] opacity-25 blur-3xl transition-colors duration-500 ${theme.accent}`}
                />

                <div className="relative z-50 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-[var(--border-color-strong)] bg-[var(--surface-color)] text-[var(--text-color)] shadow-2xl backdrop-blur-2xl sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
                        <div className="order-2 flex flex-col gap-6 p-6 sm:p-8 md:order-1 md:p-10">
                            <ProjectOnboardingHeader userName={userName} />
                            <ProjectOnboardingForm
                                data={data}
                                setData={setData}
                                errors={errors}
                                processing={processing}
                                onSubmit={handleSubmit}
                                onSkip={onSkip}
                            />
                        </div>

                        <ProjectOnboardingPreview data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
}
