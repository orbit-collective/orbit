import { ResolvedTheme, ThemeContextType, ThemeMode } from '@/types/Theme';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

const THEME_STORAGE_KEY = 'theme';
const LIGHT_MEDIA_QUERY = '(prefers-color-scheme: light)';

const isThemeMode = (value: string | null): value is ThemeMode => {
    return value === 'dark' || value === 'light' || value === 'system';
};

const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
    if (theme === 'system') {
        return typeof window !== 'undefined' &&
            window.matchMedia(LIGHT_MEDIA_QUERY).matches
            ? 'light'
            : 'dark';
    }

    return theme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const stored =
            typeof window !== 'undefined'
                ? localStorage.getItem(THEME_STORAGE_KEY)
                : null;

        return isThemeMode(stored) ? stored : 'dark';
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        resolveTheme(theme),
    );

    useEffect(() => {
        setResolvedTheme(resolveTheme(theme));

        if (theme !== 'system' || typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia(LIGHT_MEDIA_QUERY);
        const handleChange = () => setResolvedTheme(resolveTheme('system'));

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    const setTheme = (next: ThemeMode) => {
        setThemeState(next);

        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
