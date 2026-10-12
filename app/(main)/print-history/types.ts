export interface PayloadItem {
  name: string;
  qty?: number;
  price?: string | number;
  [key: string]: any;
}

export interface PrintJob {
  id: string;
  status: string;
  created_at: string;
  printed_at: string | null;
  template_id: string;
  gudang_id: string;
  device_name?: string | null;
  error_message?: string | null;
  payload_json: PayloadItem | PayloadItem[];
  label_templates: {
    name: string;
  };
  gudang?: {
    id: string;
    nama: string;
    kode_gudang: string;
  } | null;
}
