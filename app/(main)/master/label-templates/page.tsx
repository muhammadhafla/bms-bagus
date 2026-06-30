'use client';

import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

interface LabelTemplate {
  id: string;
  name: string;
  language: string;
  content_json: string;
  active: boolean;
  created_at: string;
}

export default function LabelTemplatesPage() {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    language: 'TSPL',
    content_json: '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      let parsedJson;
      try {
        parsedJson = JSON.parse(formData.content_json);
      } catch (e) {
        throw new Error('Format JSON tidak valid');
      }

      const url = editingId ? `/api/templates/${editingId}` : '/api/templates';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          language: formData.language,
          content_json: parsedJson,
          active: formData.active,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchTemplates();
        setFormData({ ...formData, name: '' });
      } else {
        throw new Error(data.error || 'Gagal menyimpan template');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: LabelTemplate) => {
    setFormData({
      name: template.name,
      language: template.language,
      content_json: typeof template.content_json === 'string' ? template.content_json : JSON.stringify(template.content_json, null, 2),
      active: template.active,
    });
    setEditingId(template.id);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus template ini?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus template');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Label Templates</h1>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              language: 'TSPL',
              content_json: '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
              active: true,
            });
            setError(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <IconPlus size={20} />
          <span>Tambah Template</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Memuat...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-600">Nama Template</th>
                <th className="p-4 font-semibold text-gray-600">Bahasa</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600">Dibuat Pada</th>
                <th className="p-4 font-semibold text-gray-600 w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">Belum ada template</td>
                </tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">{t.name}</td>
                    <td className="p-4">{t.language}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${t.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {t.active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="p-4">{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <IconEdit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Template' : 'Tambah Template Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Template</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Label Harga 33x15"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bahasa Printer</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                  >
                    <option value="TSPL">TSPL (TSC / Xprinter)</option>
                    <option value="ZPL">ZPL (Zebra)</option>
                    <option value="ESC-POS">ESC-POS (Epson)</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-1 rounded-r-lg">
                  <p className="text-sm text-blue-800 font-semibold mb-1">TIP: Panduan Koordinat</p>
                  <ul className="text-xs text-blue-700 list-disc list-inside space-y-0.5">
                    <li>Ubah nilai <strong>x</strong> menjadi lebih kecil untuk menggeser objek ke kiri.</li>
                    <li>Ubah nilai <strong>y</strong> menjadi lebih besar untuk menggeser objek ke bawah.</li>
                    <li>Koordinat ini dihitung dengan satuan milimeter (mm), menyesuaikan penggaris pada template Bartender Anda.</li>
                  </ul>
                </div>
                
                <div className="flex-1 min-h-[300px] flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                    <span>Desain JSON</span>
                    <span className="text-xs text-blue-600 cursor-pointer hover:underline">Format Guide</span>
                  </label>
                  <textarea 
                    required 
                    className="w-full flex-1 border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.content_json}
                    onChange={(e) => setFormData({...formData, content_json: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
