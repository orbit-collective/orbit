import image from '@assets/logo.webp';
import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import AuthShowcase from '@/Components/Organisms/AuthShowcase/AuthShowcase';
import { GuestLayoutProps } from '@/types/Components';

const GuestLayout = ({
    children,
    showcaseTitle,
    showcaseDescription,
}: GuestLayoutProps) => {
    const { t } = useLaravelReactI18n();

    return (
        <div className="flex min-h-screen w-full items-stretch justify-center bg-(--bg-dark-color)">
            <div className="grid w-full grid-cols-1 overflow-hidden bg-(--bg-color) lg:grid-cols-2">
                <div className="flex min-h-screen flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:min-h-0 lg:px-14 lg:py-12">
                    <Link href="/" className="flex w-fit items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                            <img
                                src={image}
                                alt={t('layout_guest.logo_alt')}
                                className={'h-8 w-8 object-contain'}
                                width={32}
                                height={32}
                            />
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-(--text-color)">
                            Orbit
                        </span>
                    </Link>

                    <div className="mx-auto w-full max-w-sm">{children}</div>

                    <p className="text-center text-xs text-(--text-gray-color)">
                        {t('layout_guest.copyright', {
                            year: new Date().getFullYear(),
                        })}
                    </p>
                </div>

                <AuthShowcase
                    title={showcaseTitle}
                    description={showcaseDescription}
                />
            </div>
        </div>
    );
};

export default GuestLayout;
