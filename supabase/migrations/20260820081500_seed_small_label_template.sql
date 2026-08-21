-- Migration: seed_small_label_template
-- Description: Adds a new label template for small items (2 QRs, cut in half)

INSERT INTO public.label_templates (id, name, language, content_json, active)
VALUES (
  uuid_generate_v4(),
  'Label Kecil (2 QR Belah)',
  'TSPL',
  '{
    "items": [
      {
        "type": "price",
        "field": "harga_jual",
        "x": 8.4,
        "y": 1.5,
        "fontSize": 8
      },
      {
        "type": "qrcode",
        "field": "kode_barcode",
        "x": 4.5,
        "y": 5.5,
        "size": 3
      },
      {
        "type": "price",
        "field": "harga_jual",
        "x": 25.3,
        "y": 1.5,
        "fontSize": 8
      },
      {
        "type": "qrcode",
        "field": "kode_barcode",
        "x": 21.4,
        "y": 5.5,
        "size": 3
      },
      {
        "type": "line",
        "x": 16.8,
        "y": 0,
        "width": 0.25,
        "thickness": 120
      }
    ]
  }'::jsonb,
  true
);
