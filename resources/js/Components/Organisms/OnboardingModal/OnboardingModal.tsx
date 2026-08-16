import BackdropBlur from '@/Components/Atoms/BackdropBlur/BackdropBlur';
import BorderOverlay from '@/Components/Atoms/BorderOverlay/BorderOverlay';
import SlideContent from '@/Components/Molecules/SlideContent/SlideContent';
import { useState } from 'react';

import onboarding1 from '@/assets/onboarding/onboarding_1.png';
import onboarding2 from '@/assets/onboarding/onboarding_2.png';
import onboarding3 from '@/assets/onboarding/onboarding_3.png';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import OnboardingModalFooter from '@/Components/Molecules/OnboardingModalFooter/OnboardingModalFooter';
import logo from '@assets/logo.png';

interface OnboardingModalProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const SLIDES = [
    {
        id: 1,
        title: 'Welcome to Orbit',
        subtitle: 'Your projects. Organized from day one.',
        description:
            'Create workspaces, invite your team, and manage every project from a single, distraction-free platform designed for modern software development.',
        image: onboarding1,
    },
    {
        id: 2,
        title: 'Track Every Issue',
        subtitle: 'Stay focused on what matters.',
        description:
            'Plan sprints, assign issues, monitor progress, and collaborate in real time with a clean interface built for speed and productivity.',
        image: onboarding2,
    },
    {
        id: 3,
        title: 'Build Better Together',
        subtitle: 'Everything connected in one place.',
        description:
            'Keep tasks, documentation, discussions, and project insights synchronized so your entire workflow stays organized from idea to release.',
        image: onboarding3,
    },
];

export default function OnboardingModal({
    isOpen = true,
    onClose,
}: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const currentSlide = SLIDES[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === SLIDES.length - 1;

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStep((prev) => prev + 1);
        } else if (onClose) {
            onClose();
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <BackdropBlur intensity="sm" />

            <div className="relative z-50 w-full max-w-5xl">
                <BorderOverlay />

                <div className="relative z-50 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-[var(--surface-color)] text-[var(--text-color)] shadow-2xl backdrop-blur-2xl sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
                    <div className="grid grid-cols-1 md:min-h-[500px] md:grid-cols-2">
                        <div className="relative order-1 h-48 w-full overflow-hidden sm:h-64 md:order-2 md:h-full">
                            <img
                                src={currentSlide.image}
                                alt={currentSlide.title}
                                className="absolute inset-0 h-full w-full object-cover object-center transition-all duration-300 ease-in-out md:object-left"
                            />
                        </div>

                        <div className="z-50 order-2 flex flex-col justify-between gap-8 p-6 sm:p-8 md:order-1 md:gap-0 md:p-12">
                            <div className="space-y-6 md:space-y-8">
                                <div className="flex items-center gap-4">
                                    <Avatar src={logo} size={'lg'} />
                                    <span className="text-xl font-bold tracking-tight text-[var(--text-color)]">
                                        Orbit
                                    </span>
                                </div>
                                <SlideContent
                                    title={currentSlide.title}
                                    subtitle={currentSlide.subtitle}
                                    description={currentSlide.description}
                                />
                            </div>
                            <OnboardingModalFooter
                                currentStep={currentStep}
                                totalSteps={SLIDES.length}
                                isFirstStep={isFirstStep}
                                isLastStep={isLastStep}
                                onPrev={handlePrev}
                                onNext={handleNext}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
