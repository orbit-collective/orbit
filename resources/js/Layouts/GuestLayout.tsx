import image from '@assets/logo.png';
import { Link } from '@inertiajs/react';
import AuthShowcase from '@/Components/Organisms/AuthShowcase/AuthShowcase';
import { GuestLayoutProps } from '@/types/Components';

const GuestLayout = ({
    children,
    showcaseTitle,
    showcaseDescription,
}: GuestLayoutProps) => {
    return (
        <div className="flex min-h-screen w-full items-stretch justify-center bg-[var(--bg-dark-color)]">
            <div className="grid w-full grid-cols-1 overflow-hidden bg-[var(--bg-color)] lg:grid-cols-2">
                <div className="flex min-h-screen flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:min-h-0 lg:px-14 lg:py-12">
                    <Link href="/" className="flex w-fit items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                            <img
                                src={image}
                                alt={'Logo'}
                                className={'h-8 w-8 object-contain'}
                                width={32}
                                height={32}
                            />
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-[var(--text-color)]">
                            Orbit
                        </span>
                    </Link>

                    <div className="mx-auto w-full max-w-sm">{children}</div>

                    <p className="text-center text-xs text-[var(--text-gray-color)]">
                        &copy; {new Date().getFullYear()} Orbit. All rights
                        reserved.
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
