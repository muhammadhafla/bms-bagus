import { Badge } from '@/components/ui';

export const getTypeBadge = (tipe: string, className?: string) => {
  switch (tipe) {
    case 'JUAL':
    case 'SETOR':
      return (
        <Badge variant="success" className={className}>
          Pemasukan ({tipe})
        </Badge>
      );
    case 'TARIK':
    case 'RETURN':
      return (
        <Badge variant="danger" className={className}>
          Pengeluaran ({tipe})
        </Badge>
      );
    case 'TUTUP_SHIFT':
      return (
        <Badge variant="default" className={className}>
          TUTUP SHIFT
        </Badge>
      );
    default:
      return (
        <Badge variant="default" className={className}>
          {tipe}
        </Badge>
      );
  }
};
