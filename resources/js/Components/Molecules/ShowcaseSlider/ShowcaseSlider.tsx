import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import { ShowcaseDots } from '@/Components/Atoms/ShowcaseDots/ShowcaseDots';

/** `text` and `highlightText` are translation keys. */
export interface ShowcaseSlide {
    text: string;
    highlightText: string;
}

const SLIDES: ShowcaseSlide[] = [
    {
        text: 'showcase_slider.slides.one.text',
        highlightText: 'showcase_slider.slides.one.highlight',
    },
    {
        text: 'showcase_slider.slides.two.text',
        highlightText: 'showcase_slider.slides.two.highlight',
    },
    {
        text: 'showcase_slider.slides.three.text',
        highlightText: 'showcase_slider.slides.three.highlight',
    },
];

interface ShowcaseSliderProps {
    autoPlayInterval?: number;
}

export const ShowcaseSlider = ({
    autoPlayInterval = 5000,
}: ShowcaseSliderProps) => {
    const { t } = useLaravelReactI18n();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % SLIDES.length);
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [autoPlayInterval, isPaused]);

    return (
        <div
            className="relative z-10 flex min-h-[72px] flex-col items-center gap-4 text-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
        >
            <AnimatePresence mode="wait">
                <motion.p
                    key={activeIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-xs text-xs leading-relaxed text-(--text-gray-color)"
                >
                    {t(SLIDES[activeIndex].text)}{' '}
                    <span className="font-semibold text-(--text-color)">
                        {t(SLIDES[activeIndex].highlightText)}
                    </span>
                </motion.p>
            </AnimatePresence>

            <ShowcaseDots
                count={SLIDES.length}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
            />
        </div>
    );
};
