CREATE POLICY "pengeluaran_operasional_delete_policy" ON public.pengeluaran_operasional FOR DELETE TO authenticated USING (true);
