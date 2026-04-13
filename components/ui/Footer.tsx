import { IconUser, IconLogout } from '@tabler/icons-react';

interface FooterProps {
  userEmail: string;
  lastLogin?: string;
  onLogout?: () => void;
  version?: string;
}

export default function Footer({ 
  userEmail, 
  lastLogin, 
  onLogout, 
  version = '1.0' 
}: FooterProps) {
  const formatLastLogin = (date?: string) => {
    if (!date) return 'First login';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <footer className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <IconUser className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{userEmail}</span>
          </div>
          
          <div className="hidden sm:block h-4 w-px bg-neutral-300 dark:bg-neutral-600" />
          
          <span className="text-neutral-400 dark:text-neutral-500 hidden sm:block">
            Last login: {formatLastLogin(lastLogin)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-neutral-400 dark:text-neutral-500">
            v{version}
          </span>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <IconLogout className="w-4 h-4" />
              Logout
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
