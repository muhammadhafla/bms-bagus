import { PrintJob, PayloadItem } from '../types';
import {
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';

export const getStatusBadge = (statusStr: string) => {
  switch (statusStr) {
    case 'Pending':
      return {
        color:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50',
        icon: <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />,
      };
    case 'Printing':
      return {
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        icon: <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />,
      };
    case 'Done':
      return {
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
        icon: <IconCheck className="mr-1 h-3 w-3" />,
      };
    case 'Failed':
      return {
        color:
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
        icon: <IconAlertTriangle className="mr-1 h-3 w-3" />,
      };
    default:
      return {
        color:
          'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
        icon: null,
      };
  }
};

export const renderStatusBadge = (statusStr: string) => {
  const badge = getStatusBadge(statusStr);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shadow-sm ${badge.color}`}
    >
      {badge.icon}
      {statusStr}
    </span>
  );
};

export const renderItemInfo = (
  job: PrintJob,
  clickable: boolean = false,
  openDetail?: (job: PrintJob) => void
) => {
  const isArrayPayload = Array.isArray(job.payload_json);
  const itemName = isArrayPayload
    ? `${job.payload_json.length} Item`
    : (job.payload_json as PayloadItem)?.name || '-';
  const itemQty = isArrayPayload ? '-' : (job.payload_json as PayloadItem)?.qty || 1;
  const itemPrice = isArrayPayload ? '' : (job.payload_json as PayloadItem)?.price || '';

  return (
    <div
      className={`flex flex-col ${clickable && isArrayPayload ? '-ml-1.5 cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}`}
      onClick={() => {
        if (clickable && isArrayPayload && openDetail) openDetail(job);
      }}
      title={clickable && isArrayPayload ? 'Klik untuk melihat rincian' : undefined}
    >
      <div className="text-base leading-tight font-semibold text-neutral-900 dark:text-white">
        {itemName}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        Template: {job.label_templates?.name || '-'}
        {isArrayPayload && clickable && (
          <span className="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:underline">
            &bull; Lihat Rincian
          </span>
        )}
      </div>
      {!isArrayPayload && (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Qty: {itemQty} {itemPrice ? ` | ${itemPrice}` : ''}
        </div>
      )}
    </div>
  );
};
