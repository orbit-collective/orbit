import { BackdropBlurProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';

const backdropVariants = cva(
    'fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-color)]',
    {
        variants: {
            intensity: {
                sm: 'backdrop-blur-sm',
                md: 'backdrop-blur-md',
                lg: 'backdrop-blur-lg',
            },
            defaultVariants: {
                intensity: 'sm',
            },
        },
    },
);

function BackdropBlur({ intensity = 'sm', className = '' }: BackdropBlurProps) {
    return (
        <div className={cn(backdropVariants({ intensity }), className)}></div>
    );
}

export default BackdropBlur;
