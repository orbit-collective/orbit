import { Link } from '@inertiajs/react';
import type { icons } from 'lucide-react';
import { Fragment } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: keyof typeof icons;
    className?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center text-xs">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const content = (
                    <>
                        {item.icon && <Icon name={item.icon} size={12} />}
                        {item.label}
                    </>
                );

                return (
                    <Fragment key={`${item.label}-${index}`}>
                        {index > 0 && (
                            <Icon
                                name="ChevronRight"
                                size={12}
                                className="mx-0.5 shrink-0 text-(--text-muted-color)"
                            />
                        )}
                        {item.href && !isLast ? (
                            <Link
                                href={item.href}
                                className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-(--text-muted-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color) ${item.className ?? ''}`}
                            >
                                {content}
                            </Link>
                        ) : (
                            <span
                                className={`flex items-center gap-1.5 px-1.5 py-0.5 font-medium ${
                                    isLast
                                        ? 'text-(--text-color)'
                                        : 'text-(--text-muted-color)'
                                } ${item.className ?? ''}`}
                            >
                                {content}
                            </span>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
