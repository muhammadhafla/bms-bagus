'use client';

import React from 'react';
import {
  IconFileText,
  IconClock,
  IconCheck,
  IconTruckDelivery,
  IconCircleCheck,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/Badge';

export const TRANSFER_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'warning' | 'info' | 'success' | 'danger' | 'default';
    icon: React.ComponentType<{ size?: number; stroke?: number; className?: string }>;
  }
> = {
  DRAFT: { label: 'Draft', variant: 'default', icon: IconFileText },
  REQUESTED: { label: 'Diajukan', variant: 'warning', icon: IconClock },
  APPROVED: { label: 'Disetujui', variant: 'info', icon: IconCheck },
  IN_TRANSIT: { label: 'Dalam Pengiriman', variant: 'warning', icon: IconTruckDelivery },
  RECEIVED: { label: 'Selesai Diterima', variant: 'success', icon: IconCircleCheck },
  CANCELED: { label: 'Dibatalkan', variant: 'danger', icon: IconX },
};

export function renderTransferStatusBadge(status: string) {
  const config = TRANSFER_STATUS_CONFIG[status] || {
    label: status,
    variant: 'default' as const,
    icon: IconFileText,
  };
  const IconComponent = config.icon;
  return (
    <Badge variant={config.variant} size="sm" className="inline-flex items-center gap-1">
      <IconComponent size={12} stroke={2} />
      <span>{config.label}</span>
    </Badge>
  );
}
