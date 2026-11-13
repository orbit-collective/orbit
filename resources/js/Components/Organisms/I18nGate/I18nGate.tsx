import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC, ReactNode, useRef } from 'react';

/**
 * Translation files load on demand, so the app renders only once the active
 * language is in; otherwise the first paint would show raw translation keys.
 * It waits for the first load only: loading a language the user switches to
 * later must not unmount the app, which would drop unsaved work (a comment
 * being typed, a form, dashboard edits). The texts switch when the file
 * arrives.
 */
const I18nGate: FC<{ children: ReactNode }> = ({ children }) => {
    const { loading } = useLaravelReactI18n();
    const hasLoaded = useRef(false);

    if (!loading) hasLoaded.current = true;

    return loading && !hasLoaded.current ? null : <>{children}</>;
};

export default I18nGate;
