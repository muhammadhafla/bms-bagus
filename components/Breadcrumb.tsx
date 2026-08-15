import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-neutral-400 dark:text-neutral-500">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
