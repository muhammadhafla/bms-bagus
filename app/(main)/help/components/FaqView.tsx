'use client';

import React, { useState } from 'react';
import {
  IconHelpCircle,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconPhone,
  IconBrandWhatsapp,
  IconMail,
  IconCopy,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { FAQ_DATA, SUPPORT_INFO } from '../data/faq-data';
import { Profile } from '@/lib/auth';
import { toast } from 'sonner';

interface FaqViewProps {
  profile: Profile | null;
  userRoles: string[];
}

export function FaqView({ profile, userRoles }: FaqViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'role' | 'gudang' | 'kasir' | 'finance' | 'teknis'>('all');
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(['faq-1']);
  const [copiedDebug, setCopiedDebug] = useState(false);

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const handleCopyDebugInfo = () => {
    const debugText = `BMS Debug Info:
- User: ${profile?.nama || 'Unknown'} (${profile?.email || 'N/A'})
- Active Roles: ${userRoles.join(', ')}
- Default Gudang ID: ${profile?.default_gudang_id || 'Global'}
- App Version: ${SUPPORT_INFO.version}
- Local Time: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(debugText);
    setCopiedDebug(true);
    toast.success('Informasi debug akun berhasil disalin ke clipboard');
    setTimeout(() => setCopiedDebug(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <IconHelpCircle size={13} />
              <span>Knowledge Base & Bantuan Teknis</span>
            </div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mt-1">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Jawaban cepat untuk pertanyaan operasional harian, keamanan akses, dan kendala teknis.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <IconSearch size={14} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan FAQ..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 py-1.5 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
            Topik:
          </span>
          {[
            { id: 'all', label: 'Semua FAQ' },
            { id: 'role', label: 'Hak Akses & Role' },
            { id: 'gudang', label: 'Gudang & Mutasi' },
            { id: 'kasir', label: 'Kasir & POS' },
            { id: 'finance', label: 'Keuangan' },
            { id: 'teknis', label: 'Kendala Teknis' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <Card className="overflow-hidden border border-neutral-200/80 dark:border-neutral-800">
        <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqIds.includes(faq.id);
              return (
                <div key={faq.id} className="p-4 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-850/40">
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="flex w-full items-center justify-between text-left text-xs font-bold text-neutral-900 dark:text-white gap-3"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <IconChevronUp size={16} className="text-neutral-400 shrink-0" />
                    ) : (
                      <IconChevronDown size={16} className="text-neutral-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p
                      id={`faq-answer-${faq.id}`}
                      className="mt-2.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pl-1 border-l-2 border-brand-500"
                    >
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500">
              Tidak ada pertanyaan yang sesuai dengan kata kunci &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support Contact & Emergency Hotline */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* IT Helpdesk */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
              <IconBrandWhatsapp className="h-5 w-5 text-emerald-600" />
              <span>Layanan Bantuan & IT Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-neutral-600 dark:text-neutral-300">
              Hubungi tim IT jika mengalami kendala akun terkunci, printer tidak terdeteksi, atau kendala sinkronisasi.
            </p>
            <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2 text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold">WhatsApp IT:</span>
                <a
                  href={`https://wa.me/${SUPPORT_INFO.itSupport.whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-emerald-600 hover:underline"
                >
                  {SUPPORT_INFO.itSupport.whatsapp}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Email:</span>
                <a
                  href={`mailto:${SUPPORT_INFO.itSupport.email}`}
                  className="font-mono text-brand-600 hover:underline dark:text-brand-400"
                >
                  {SUPPORT_INFO.itSupport.email}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Jam Operasional:</span>
                <span className="text-neutral-500">{SUPPORT_INFO.itSupport.operationalHours}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Diagnostics & Account Info */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
              <IconInfoCircle className="h-5 w-5 text-brand-600" />
              <span>Informasi Diagnostik Sistem</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-neutral-600 dark:text-neutral-300">
              Sertakan informasi diagnostik ini saat melaporkan bug atau meminta penyesuaian hak akses role kepada IT.
            </p>
            <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-1.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Versi Sistem:</span>
                <strong className="text-neutral-900 dark:text-white">{SUPPORT_INFO.version}</strong>
              </div>
              <div className="flex justify-between">
                <span>Akun Anda:</span>
                <strong className="text-neutral-900 dark:text-white">{profile?.nama || 'Pengguna'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Role Aktif:</span>
                <strong className="text-neutral-900 dark:text-white">{userRoles.join(', ')}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyDebugInfo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              {copiedDebug ? (
                <>
                  <IconCheck size={14} className="text-emerald-600" />
                  <span className="text-emerald-600">Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <IconCopy size={14} />
                  <span>Salin Info Diagnostik Akun</span>
                </>
              )}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
