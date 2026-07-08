const SUPABASE_URL = 'https://letxagpmrumwcjuzruyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHhhZ3BtcnVtd2NqdXpydXlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc5MTYwOSwiZXhwIjoyMDkxMzY3NjA5fQ.pPTrE6FjkjnGro4eYz9RnBFJSUKfZsie3EQAPr8-OHM';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function fixHpp() {
  console.log("Memperbaiki HPP di transaksi...");
  
  // Ambil semua inventory id & harga_beli_terakhir
  const invRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?select=id,harga_beli_terakhir`, { headers });
  if (!invRes.ok) {
    console.error("Error get inventory:", await invRes.text());
    return;
  }
  const inventory = await invRes.json();
  
  console.log(`Ditemukan ${inventory.length} barang.`);
  
  let updatedCount = 0;
  
  for (const item of inventory) {
    if (item.harga_beli_terakhir === null || item.harga_beli_terakhir === undefined) continue;
    
    // Update penjualan_items
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/penjualan_items?inventory_id=eq.${item.id}&cost_at_sale=neq.${item.harga_beli_terakhir}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ cost_at_sale: item.harga_beli_terakhir })
    });
      
    if (!updateRes.ok) {
      console.error(`Error update untuk inventory ${item.id}:`, await updateRes.text());
    } else {
      const data = await updateRes.json();
      if (data && data.length > 0) {
        console.log(`Update ${data.length} transaksi untuk item ${item.id} dengan harga modal ${item.harga_beli_terakhir}`);
        updatedCount += data.length;
      }
    }
  }
  
  console.log(`Selesai! Total ${updatedCount} transaksi berhasil diperbaiki HPP-nya.`);
}

fixHpp();
