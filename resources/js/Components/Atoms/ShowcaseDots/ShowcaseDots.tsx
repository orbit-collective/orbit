import { useLaravelReactI18n } from 'laravel-react-i18n';
import { ShowcaseDotsProps } from '@/types/Components';

export const ShowcaseDots = ({
    count,
    activeIndex,
    onSelect,
}: ShowcaseDotsProps) => {
    const { t } = useLaravelReactI18n();
    return (
        <div className="flex items-center gap-1.5" role="tablist">
            {Array.from({ length: count }).map((_, index) => {
                const isActive = index === activeIndex;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onSelect(index)}
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={t('showcase_dots.go_to', {
                            number: index + 1,
                        })}
                        className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                            isActive
                                ? 'w-5 bg-(--accent-color)'
                                : 'w-1.5 bg-(--bg-light-color) hover:bg-(--accent-light-color)'
                        }`}
                    />
                );
            })}
        </div>
    );
};
