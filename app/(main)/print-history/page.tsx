'use client';

import { useState, useEffect } from 'react';

interface PrintJob {
  id: string;
  status: string;
  created_at: string;
  printed_at: string | null;
  payload_json: any;
  label_templates: {
    name: string;
  };
}

export default function PrintHistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/print/history');
      const data = await res.json();
      if (data.history) {
        setJobs(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch print history', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Printing': return 'bg-blue-100 text-blue-800';
      case 'Done': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Cetak Label</h1>
        <button 
          onClick={() => { setLoading(true); fetchHistory(); }}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Memuat riwayat...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">ID Job</th>
                  <th className="p-4 font-semibold text-gray-600">Template</th>
                  <th className="p-4 font-semibold text-gray-600">Item</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600">Waktu Buat</th>
                  <th className="p-4 font-semibold text-gray-600">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Belum ada riwayat cetak</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                      <td className="p-4 font-mono text-xs text-gray-500">{job.id.substring(0, 8)}...</td>
                      <td className="p-4 font-medium text-gray-800">{job.label_templates?.name || '-'}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{job.payload_json?.name || '-'}</span>
                          <span className="text-xs text-gray-500">Qty: {job.payload_json?.qty || 1} | {job.payload_json?.price || ''}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{new Date(job.created_at).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-gray-600">{job.printed_at ? new Date(job.printed_at).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
