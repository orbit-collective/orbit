import { Head, Link, useForm } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Divider from '@/Components/Atoms/Divider/Divider';
import AuthFormHeader from '@/Components/Molecules/AuthFormHeader/AuthFormHeader';
import FormField from '@/Components/Molecules/FormField/FormField';
import PasswordField from '@/Components/Molecules/PasswordField/PasswordField';
import SocialLoginButtons from '@/Components/Molecules/SocialLoginButtons/SocialLoginButtons';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login() {
    const { t } = useLaravelReactI18n();
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            showcaseTitle={
                <>
                    {t('page_login.showcase.title_start')}{' '}
                    <span className="text-(--accent-color)">
                        {t('page_login.showcase.title_accent')}
                    </span>
                </>
            }
            showcaseDescription={t('page_login.showcase.description')}
        >
            <Head title={t('page_login.head')} />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <AuthFormHeader
                    icon="LogIn"
                    title={t('page_login.welcome')}
                    description={t('page_login.subtitle')}
                />

                <div className="flex flex-col gap-4">
                    <FormField
                        id="email"
                        label={t('page_login.email')}
                        type="email"
                        icon="Mail"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder={t('page_login.email_placeholder')}
                        error={errors.email}
                        autoComplete="username"
                        required
                    />
                    <PasswordField
                        id="password"
                        label={t('page_login.password')}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        error={errors.password}
                        autoComplete="current-password"
                        required
                    />

                    <div className="flex items-center justify-between">
                        <Checkbox
                            id="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                            label={t('page_login.remember')}
                        />
                        <span
                            className="cursor-not-allowed text-sm font-medium text-(--text-gray-color) opacity-60"
                            title={t('page_login.forgot_soon')}
                        >
                            {t('page_login.forgot')}
                        </span>
                    </div>
                </div>

                <Button isDisabled={processing} className="w-full py-2.5">
                    {processing
                        ? t('page_login.submitting')
                        : t('page_login.submit')}
                </Button>

                <Divider label={t('page_login.or_continue')} />
                <SocialLoginButtons />

                <p className="text-center text-sm text-(--text-gray-color)">
                    {t('page_login.no_account')}{' '}
                    <Link
                        href={route('register')}
                        className="font-semibold text-(--accent-light-color) hover:underline"
                    >
                        {t('page_login.sign_up')}
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
