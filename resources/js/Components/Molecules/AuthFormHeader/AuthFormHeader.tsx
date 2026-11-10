import Icon from '@/Components/Atoms/Icon/Icon';
import { AuthFormHeaderProps } from '@/types/Components';

const AuthFormHeader = ({ icon, title, description }: AuthFormHeaderProps) => {
    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-(--accent-color) to-(--accent-light-color) shadow-[0_0_20px_var(--accent-color-opacity)]">
                <Icon name={icon} size={22} className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-semibold text-(--text-color)">
                    {title}
                </h1>
                <p className="mt-1 text-sm text-(--text-gray-color)">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default AuthFormHeader;
