import { FC } from 'react';
import { cn } from '@/utils/cn';

interface LanguageFlagProps {
    /** Language code ("en", "pl"). An unknown code draws a neutral tile. */
    code: string;
    className?: string;
}

/**
 * The flag of the country a language is most associated with, drawn as a
 * small inline SVG (emoji flags depend on the system's emoji font and are
 * missing on some Linux and Windows setups). Decorative: the language name
 * always sits next to it.
 */
const LanguageFlag: FC<LanguageFlagProps> = ({ code, className }) => (
    <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        focusable="false"
        className={cn(
            'h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]',
            className,
        )}
    >
        {code === 'pl' && (
            <>
                <rect width="24" height="8" fill="#ffffff" />
                <rect y="8" width="24" height="8" fill="#dc143c" />
            </>
        )}
        {code === 'en' && (
            <>
                <rect width="24" height="16" fill="#012169" />
                <path
                    d="M0 0 24 16M24 0 0 16"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                />
                <path
                    d="M0 0 24 16M24 0 0 16"
                    stroke="#c8102e"
                    strokeWidth="1.2"
                />
                <path d="M12 0v16M0 8h24" stroke="#ffffff" strokeWidth="5.2" />
                <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3" />
            </>
        )}
        {code !== 'pl' && code !== 'en' && (
            <rect width="24" height="16" fill="#52525b" />
        )}
    </svg>
);

export default LanguageFlag;
