import { Head, Link, useForm } from '@inertiajs/react';
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
                    Plan Better,{' '}
                    <span className="text-[var(--accent-color)]">
                        Ship Faster
                    </span>
                </>
            }
            showcaseDescription="Bring issues, projects, and your whole team into one orbit — track progress and ship with confidence."
        >
            <Head title="Log in" />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <AuthFormHeader
                    icon="LogIn"
                    title="Welcome back"
                    description="Enter your credentials to access your workspace"
                />

                <div className="flex flex-col gap-4">
                    <FormField
                        id="email"
                        label="Email"
                        type="email"
                        icon="Mail"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="you@example.com"
                        error={errors.email}
                        autoComplete="username"
                        required
                    />
                    <PasswordField
                        id="password"
                        label="Password"
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
                            label="Remember me"
                        />
                        <span
                            className="cursor-not-allowed text-sm font-medium text-[var(--text-gray-color)] opacity-60"
                            title="Password reset is coming soon"
                        >
                            Forgot password?
                        </span>
                    </div>
                </div>

                <Button isDisabled={processing} className="w-full py-2.5">
                    {processing ? 'Logging in...' : 'Log in'}
                </Button>

                <Divider label="Or continue with" />
                <SocialLoginButtons />

                <p className="text-center text-sm text-[var(--text-gray-color)]">
                    Don&apos;t have an account?{' '}
                    <Link
                        href={route('register')}
                        className="font-semibold text-[var(--accent-light-color)] hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
