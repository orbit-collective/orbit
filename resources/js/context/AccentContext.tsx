import { useTheme } from '@/context/ThemeContext';
import { AccentColor, AccentContextType } from '@/types/Accent';
import { getAccentCssVariables } from '@/utils/accentColors';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

const ACCENT_STORAGE_KEY = 'accentColor';

const isAccentColor = (value: string | null): value is AccentColor => {
    return (
        value === 'default' ||
        value === 'red' ||
        value === 'orange' ||
        value === 'yellow' ||
        value === 'green' ||
        value === 'lime' ||
        value === 'blue' ||
        value === 'sky' ||
        value === 'violet' ||
        value === 'purple' ||
        value === 'pink'
    );
};

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export const AccentProvider = ({ children }: { children: ReactNode }) => {
    const { resolvedTheme } = useTheme();

    const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
        const stored =
            typeof window !== 'undefined'
                ? localStorage.getItem(ACCENT_STORAGE_KEY)
                : null;

        return isAccentColor(stored) ? stored : 'default';
    });

    useEffect(() => {
        const root = document.documentElement;
        const variables = getAccentCssVariables(accentColor, resolvedTheme);

        if (!variables) {
            root.style.removeProperty('--accent-color');
            root.style.removeProperty('--accent-light-color');
            root.style.removeProperty('--accent-color-opacity');
            return;
        }

        root.style.setProperty('--accent-color', variables.accentColor);
        root.style.setProperty(
            '--accent-light-color',
            variables.accentLightColor,
        );
        root.style.setProperty(
            '--accent-color-opacity',
            variables.accentColorOpacity,
        );
    }, [accentColor, resolvedTheme]);

    const setAccentColor = (next: AccentColor) => {
        setAccentColorState(next);

        if (typeof window !== 'undefined') {
            localStorage.setItem(ACCENT_STORAGE_KEY, next);
        }
    };

    return (
        <AccentContext.Provider value={{ accentColor, setAccentColor }}>
            {children}
        </AccentContext.Provider>
    );
};

export const useAccent = (): AccentContextType => {
    const context = useContext(AccentContext);
    if (!context) {
        throw new Error('useAccent must be used within an AccentProvider');
    }
    return context;
};
