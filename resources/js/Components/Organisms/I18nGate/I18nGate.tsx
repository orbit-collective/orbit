import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC, ReactNode } from 'react';

/**
 * Translation files load on demand, so the app renders only once the active
 * language is in; otherwise the first paint would show raw translation keys.
 */
const I18nGate: FC<{ children: ReactNode }> = ({ children }) => {
    const { loading } = useLaravelReactI18n();

    return loading ? null : <>{children}</>;
};

export default I18nGate;
