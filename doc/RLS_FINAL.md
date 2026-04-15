# PANDUAN RLS FINAL - SISTEM INVENTORY 1 TOKO MULTI USER

---

## 🎯 Aturan Dasar Sistem
> Satu toko, banyak user. Semua user melihat SEMUA data di toko yang sama.
>
> | Role | Akses |
> |------|-------|
> | `admin` | Full akses 100% semua data, semua operasi, approve opname, kelola user |
> | `staff` | Bisa melihat SEMUA data, HANYA BISA MEMBUAT transaksi baru |

---

## 🔧 Helper Function Dasar
```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_audit_fields() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_at := NOW();
    NEW.updated_at := NOW();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    NEW.updated_by := auth.uid();
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 Policy Per Tabel

### ✅ 1. Tabel `profiles` (User)
```sql
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY profiles_admin_all ON profiles FOR ALL
USING (is_admin());

-- Trigger audit
CREATE TRIGGER set_audit_profiles BEFORE INSERT OR UPDATE ON profiles 
FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
```

---

### ✅ 2. Tabel `inventory` (Barang)
```sql
CREATE POLICY inventory_select ON inventory FOR SELECT USING (true);
CREATE POLICY inventory_insert ON inventory FOR INSERT WITH CHECK (is_admin());
CREATE POLICY inventory_update ON inventory FOR UPDATE USING (is_admin());
CREATE POLICY inventory_delete ON inventory FOR DELETE USING (is_admin());

CREATE TRIGGER set_audit_inventory BEFORE INSERT OR UPDATE ON inventory 
FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
```

---

### ✅ 3. Tabel `kategori` & `supplier`
```sql
-- Kategori
CREATE POLICY kategori_select ON kategori FOR SELECT USING (true);
CREATE POLICY kategori_all_admin ON kategori FOR ALL USING (is_admin());

-- Supplier
CREATE POLICY supplier_select ON supplier FOR SELECT USING (true);
CREATE POLICY supplier_all_admin ON supplier FOR ALL USING (is_admin());
```

---

### ✅ 4. Tabel `penjualan` & `penjualan_items`
```sql
-- Penjualan Header
CREATE POLICY penjualan_select ON penjualan FOR SELECT USING (true);
CREATE POLICY penjualan_insert ON penjualan FOR INSERT WITH CHECK (true);
CREATE POLICY penjualan_update ON penjualan FOR UPDATE USING (is_admin());
CREATE POLICY penjualan_delete ON penjualan FOR DELETE USING (is_admin());

-- Penjualan Items
CREATE POLICY penjualan_items_select ON penjualan_items FOR SELECT USING (true);
CREATE POLICY penjualan_items_insert ON penjualan_items FOR INSERT WITH CHECK (true);
CREATE POLICY penjualan_items_update ON penjualan_items FOR UPDATE USING (is_admin());
CREATE POLICY penjualan_items_delete ON penjualan_items FOR DELETE USING (is_admin());

CREATE TRIGGER set_audit_penjualan BEFORE INSERT OR UPDATE ON penjualan 
FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
```

---

### ✅ 5. Tabel `pembelian` & `pembelian_items`
```sql
-- Pembelian Header
CREATE POLICY pembelian_select ON pembelian FOR SELECT USING (true);
CREATE POLICY pembelian_insert ON pembelian FOR INSERT WITH CHECK (true);
CREATE POLICY pembelian_update ON pembelian FOR UPDATE USING (is_admin());
CREATE POLICY pembelian_delete ON pembelian FOR DELETE USING (is_admin());

-- Pembelian Items
CREATE POLICY pembelian_items_select ON pembelian_items FOR SELECT USING (true);
CREATE POLICY pembelian_items_insert ON pembelian_items FOR INSERT WITH CHECK (true);
CREATE POLICY pembelian_items_update ON pembelian_items FOR UPDATE USING (is_admin());
CREATE POLICY pembelian_items_delete ON pembelian_items FOR DELETE USING (is_admin());

CREATE TRIGGER set_audit_pembelian BEFORE INSERT OR UPDATE ON pembelian 
FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
```

---

### ✅ 6. Tabel `stock_movements`
```sql
CREATE POLICY stock_movements_select ON stock_movements FOR SELECT USING (true);
CREATE POLICY stock_movements_insert ON stock_movements FOR INSERT WITH CHECK (false);
CREATE POLICY stock_movements_update ON stock_movements FOR UPDATE USING (false);
CREATE POLICY stock_movements_delete ON stock_movements FOR DELETE USING (false);
```

---

### ✅ 7. Stock Opname Workflow
```sql
-- Stock Opname Header
CREATE POLICY stock_opname_select ON stock_opname FOR SELECT USING (true);

CREATE POLICY stock_opname_insert ON stock_opname FOR INSERT
WITH CHECK (status = 'draft');

CREATE POLICY stock_opname_update ON stock_opname FOR UPDATE
USING (is_admin() OR (status = 'draft' AND created_by = auth.uid()));

CREATE POLICY stock_opname_delete ON stock_opname FOR DELETE
USING (is_admin() OR (status = 'draft' AND created_by = auth.uid()));

-- Stock Opname Items
CREATE POLICY stock_opname_items_select ON stock_opname_items FOR SELECT USING (true);

CREATE POLICY stock_opname_items_insert ON stock_opname_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stock_opname 
    WHERE id = stock_opname_id
    AND (is_admin() OR (status = 'draft' AND created_by = auth.uid()))
  )
);

CREATE POLICY stock_opname_items_update ON stock_opname_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM stock_opname 
    WHERE id = stock_opname_id
    AND (is_admin() OR (status = 'draft' AND created_by = auth.uid()))
  )
);

CREATE POLICY stock_opname_items_delete ON stock_opname_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM stock_opname 
    WHERE id = stock_opname_id
    AND (is_admin() OR (status = 'draft' AND created_by = auth.uid()))
  )
);
```

---

### ✅ 8. Stock Adjustments
```sql
CREATE POLICY stock_adjustments_select ON stock_adjustments FOR SELECT USING (true);
CREATE POLICY stock_adjustments_insert ON stock_adjustments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY stock_adjustments_update ON stock_adjustments FOR UPDATE USING (false);
CREATE POLICY stock_adjustments_delete ON stock_adjustments_for DELETE USING (false);
```

---

## 🔑 Aturan Final Yang Wajib Diterapkan
1. ✅ Semua staff dan admin melihat SEMUA data di toko yang sama
2. ✅ Staff **HANYA BISA MEMBUAT** transaksi baru
3. ✅ Staff **TIDAK BISA** mengubah, menghapus, mengedit apapun yang sudah dibuat
4. ✅ Staff bisa membuat opname, tapi hanya bisa edit selama status `draft`
5. ✅ Setelah opname dikirim untuk approve, staff tidak bisa ubah apapun
6. ✅ Hanya admin yang bisa approve/reject opname
7. ✅ Tidak ada yang bisa mengubah atau menghapus `stock_movements`
8. ✅ Semua transaksi otomatis tercatat siapa yang membuat, tidak bisa diubah siapapun

---

## ❌ Yang Dilarang Keras
1. Jangan pernah menghilangkan trigger `set_audit_fields`
2. Jangan pernah membuat policy `WITH CHECK (true)` untuk operasi update/delete
3. Jangan pernah percaya nilai `created_by` yang dikirim dari client
4. Jangan pernah mengijinkan staff mengupdate harga barang

---

## ✅ Langkah Instalasi
1. Hapus SEMUA policy lama yang ada
2. Jalankan script helper function
3. Jalankan semua policy diatas berurutan
4. Pasang semua trigger
5. Jalankan `ALTER TABLE nama_tabel FORCE ROW LEVEL SECURITY` untuk semua tabel