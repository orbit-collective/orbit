import { Head, Link, useForm } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Divider from '@/Components/Atoms/Divider/Divider';
import AuthFormHeader from '@/Components/Molecules/AuthFormHeader/AuthFormHeader';
import FormField from '@/Components/Molecules/FormField/FormField';
import PasswordField from '@/Components/Molecules/PasswordField/PasswordField';
import PasswordStrengthMeter from '@/Components/Molecules/PasswordStrengthMeter/PasswordStrengthMeter';
import SocialLoginButtons from '@/Components/Molecules/SocialLoginButtons/SocialLoginButtons';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
    const { t } = useLaravelReactI18n();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            showcaseTitle={
                <>
                    {t('page_register.showcase.title_start')}{' '}
                    <span className="text-(--accent-color)">
                        {t('page_register.showcase.title_accent')}
                    </span>
                </>
            }
            showcaseDescription={t('page_register.showcase.description')}
        >
            <Head title={t('page_register.head')} />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <AuthFormHeader
                    icon="UserPlus"
                    title={t('page_register.title')}
                    description={t('page_register.subtitle')}
                />

                <div className="flex flex-col gap-4">
                    <FormField
                        id="name"
                        label={t('page_register.name')}
                        icon="User"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={t('page_register.name_placeholder')}
                        error={errors.name}
                        autoComplete="name"
                        required
                    />
                    <FormField
                        id="email"
                        label={t('page_register.email')}
                        type="email"
                        icon="Mail"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder={t('page_register.email_placeholder')}
                        error={errors.email}
                        autoComplete="username"
                        required
                    />
                    <div className="space-y-1.5">
                        <PasswordField
                            id="password"
                            label={t('page_register.password')}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            error={errors.password}
                            autoComplete="new-password"
                            required
                        />
                        <PasswordStrengthMeter password={data.password} />
                    </div>
                    <PasswordField
                        id="password_confirmation"
                        label={t('page_register.confirm_password')}
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        error={errors.password_confirmation}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <Button isDisabled={processing} className="w-full py-2.5">
                    {processing
                        ? t('page_register.submitting')
                        : t('page_register.submit')}
                </Button>

                <Divider label={t('page_register.or_continue')} />
                <SocialLoginButtons />

                <p className="text-center text-sm text-(--text-gray-color)">
                    {t('page_register.have_account')}{' '}
                    <Link
                        href={route('login')}
                        className="font-semibold text-(--accent-light-color) hover:underline"
                    >
                        {t('page_register.log_in')}
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
