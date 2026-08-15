import { IconUser, IconLogout } from '@tabler/icons-react';
import { formatDateWIB } from '@/lib/utils';

interface FooterProps {
  userEmail: string;
  lastLogin?: string;
  onLogout?: () => void;
  version?: string;
}

export default function Footer({ userEmail, lastLogin, onLogout, version = '1.0' }: FooterProps) {
  const formatLastLogin = (date?: string) => {
    if (!date) return 'First login';
    return formatDateWIB(date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <footer className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <IconUser className="h-4 w-4" />
            <span className="max-w-[200px] truncate">{userEmail}</span>
          </div>

          <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-600" />

          <span className="hidden text-neutral-400 sm:block dark:text-neutral-500">
            Last login: {formatLastLogin(lastLogin)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-neutral-400 dark:text-neutral-500">v{version}</span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <IconLogout className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
