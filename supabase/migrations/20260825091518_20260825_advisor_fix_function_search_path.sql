-- Migration: Fix function search_path to prevent search path hijacking
-- Purpose: Explicitly set search_path on functions that were missing it
-- Advisor issue: Function Search Path Mutable

ALTER FUNCTION public.check_and_notify_absensi() SET search_path TO 'public';
ALTER FUNCTION public.fn_apply_penjualan_return_stock() SET search_path TO 'public';
ALTER FUNCTION public.fn_apply_penjualan_stock() SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_atv(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_busiest_hours(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_categories(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_payment_methods(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_profitability(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_returns(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_sales_trend(timestamp with time zone, timestamp with time zone, text) SET search_path TO 'public';
ALTER FUNCTION public.get_analytics_stock_velocity(timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.notify_admin_on_kasbon() SET search_path TO 'public';
ALTER FUNCTION public.penjualan_items_set_penjualan_total() SET search_path TO 'public';
ALTER FUNCTION public.pembelian_return_create(uuid, date, uuid, text, uuid, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.penjualan_return_create(uuid, date, uuid, text, uuid, jsonb) SET search_path TO 'public';

