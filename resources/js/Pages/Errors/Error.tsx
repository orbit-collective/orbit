import { Head } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import ErrorScreen, {
    ERROR_COPY,
} from '@/Components/Organisms/ErrorScreen/ErrorScreen';
import { ErrorScreenProps } from '@/types/Components';

export default function Error({ status, path }: ErrorScreenProps) {
    const { t } = useLaravelReactI18n();

    return (
        <>
            <Head title={t(ERROR_COPY[status].title)} />
            <ErrorScreen status={status} path={path} />
        </>
    );
}
