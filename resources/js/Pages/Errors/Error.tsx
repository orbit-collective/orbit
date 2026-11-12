import { Head } from '@inertiajs/react';
import ErrorScreen, {
    ERROR_COPY,
} from '@/Components/Organisms/ErrorScreen/ErrorScreen';
import { ErrorScreenProps } from '@/types/Components';

export default function Error({ status, path }: ErrorScreenProps) {
    return (
        <>
            <Head title={ERROR_COPY[status].title} />
            <ErrorScreen status={status} path={path} />
        </>
    );
}
