'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconFileText,
  IconClock,
  IconUser,
  IconEdit,
  IconShare,
  IconPrinter,
  IconArrowLeft,
  IconTag,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { HelpArticle } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useIsAdmin } from '@/lib/auth';
import { toast } from 'sonner';

interface MarkdownDocViewProps {
  article: HelpArticle;
  onBack?: () => void;
}

export function MarkdownDocView({ article, onBack }: MarkdownDocViewProps) {
  const isAdminUser = useIsAdmin();

  // Approximate read time (200 words per minute)
  const wordCount = article.content_md?.split(/\s+/).length || 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan artikel disalin ke clipboard');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Article Header Card */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 capitalize dark:bg-brand-950 dark:text-brand-300">
                <IconTag size={12} />
                <span>{article.category || 'Panduan Umum'}</span>
              </span>

              {article.is_published === false && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  DRAF / BELUM DITERBITKAN
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <IconClock size={14} />
                <span>Estimasi Waktu Baca: ±{readTimeMin} menit</span>
              </span>
              {article.updated_at && (
                <span>
                  Diperbarui: {new Date(article.updated_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Admin Edit Link */}
            {isAdminUser && (
              <Link
                href={`/help/editor?id=${article.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                <IconEdit size={14} />
                <span>Edit Dokumen</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              title="Salin Tautan"
              aria-label="Salin Tautan"
            >
              <IconShare size={15} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              title="Cetak Artikel"
              aria-label="Cetak Artikel"
            >
              <IconPrinter size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Article Content Container */}
      <Card className="border border-neutral-200/80 p-6 sm:p-8 dark:border-neutral-800">
        <MarkdownRenderer content={article.content_md} />
      </Card>
    </div>
  );
}
