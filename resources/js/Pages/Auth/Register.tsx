import Button from '@/Components/Atoms/Button/Button';
import Divider from '@/Components/Atoms/Divider/Divider';
import AuthFormHeader from '@/Components/Molecules/AuthFormHeader/AuthFormHeader';
import FormField from '@/Components/Molecules/FormField/FormField';
import PasswordField from '@/Components/Molecules/PasswordField/PasswordField';
import PasswordStrengthMeter from '@/Components/Molecules/PasswordStrengthMeter/PasswordStrengthMeter';
import SocialLoginButtons from '@/Components/Molecules/SocialLoginButtons/SocialLoginButtons';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { SyntheticEvent } from 'react';

export default function Register() {
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
                    Join the Team,{' '}
                    <span className="text-[var(--accent-color)]">
                        Build Together
                    </span>
                </>
            }
            showcaseDescription="Create your workspace in seconds and start tracking issues, projects, and progress with your team."
        >
            <Head title="Create account" />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <AuthFormHeader
                    icon="UserPlus"
                    title="Create your account"
                    description="Start organizing your work in just a minute"
                />

                <div className="flex flex-col gap-4">
                    <FormField
                        id="name"
                        label="Full name"
                        icon="User"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Jane Doe"
                        error={errors.name}
                        autoComplete="name"
                        required
                    />
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
                    <div className="space-y-1.5">
                        <PasswordField
                            id="password"
                            label="Password"
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
                        label="Confirm password"
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
                    {processing ? 'Creating account...' : 'Create account'}
                </Button>

                <Divider label="Or continue with" />
                <SocialLoginButtons />

                <p className="text-center text-sm text-[var(--text-gray-color)]">
                    Already have an account?{' '}
                    <Link
                        href={route('login')}
                        className="font-semibold text-[var(--accent-light-color)] hover:underline"
                    >
                        Log in
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
