'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  IconInfoCircle,
  IconSparkles,
  IconAlertTriangle,
  IconShieldLock,
  IconCheck,
  IconCopy,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { toast } from 'sonner';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block (```lang ... ```)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeText = codeLines.join('\n');
      elements.push(<CodeBlock key={`code-${i}`} code={codeText} language={lang} />);
      i++;
      continue;
    }

    // 2. GitHub-style Alerts (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION])
    if (line.trim().startsWith('> [!')) {
      const alertTypeMatch = line.trim().match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertTypeMatch) {
        const alertType = alertTypeMatch[1].toUpperCase();
        const alertLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          alertLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <AlertBox
            key={`alert-${i}`}
            type={alertType}
            content={alertLines.join('\n')}
          />
        );
        continue;
      }
    }

    // 3. Regular Blockquote (> quote)
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-brand-500 bg-neutral-50/60 p-3.5 italic text-xs sm:text-sm text-neutral-700 dark:border-brand-400 dark:bg-neutral-900/40 dark:text-neutral-300 rounded-r-xl my-3"
        >
          {renderInlineMarkdown(quoteLines.join('\n'))}
        </blockquote>
      );
      continue;
    }

    // 4. Tables (| col1 | col2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }

    // 5. Headings (# H1, ## H2, ### H3, #### H4)
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-6 mb-3">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight mt-5 mb-2.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-200 mt-4 mb-2">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-300 mt-3 mb-1.5">
          {renderInlineMarkdown(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 6. Horizontal Rule (--- or ***)
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(
        <hr key={`hr-${i}`} className="my-5 border-t border-neutral-200 dark:border-neutral-800" />
      );
      i++;
      continue;
    }

    // 7. Unordered Lists (* item, - item)
    if (line.trim().match(/^[-*]\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s+/)) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-2.5 pl-5 list-disc text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 marker:text-brand-500">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Ordered Lists (1. item)
    if (line.trim().match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-2 my-2.5 pl-5 list-decimal text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 marker:font-bold marker:text-brand-600">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-1">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Blank Lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // 10. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed my-2">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

// Inline Markdown Parser (Bold, Italic, Code, Link, Kbd, Images)
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return '';

  // Process tokens
  // 1. Kbd tags: <kbd>F2</kbd>
  // 2. Images: ![alt](url)
  // 3. Links: [text](url)
  // 4. Code: `code`
  // 5. Bold: **bold**
  // 6. Italic: *italic* or _italic_
  // 7. Strikethrough: ~~strike~~

  // Simple regex tokenizer
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  const inlineRegex = /(<kbd>.*?<\/kbd>|!\[.*?\]\(.*?\)|\(.*?\)|`.*?`|\*\*.*?\*\*|\*.*?\*|~~.*?~~|\[.*?\]\(.*?\))/;

  while (remaining) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before match
    if (match.index > 0) {
      parts.push(remaining.substring(0, match.index));
    }

    const token = match[0];
    keyIdx++;

    // <kbd>Key</kbd>
    if (token.startsWith('<kbd>') && token.endsWith('</kbd>')) {
      const kbdText = token.slice(5, -6);
      parts.push(
        <kbd
          key={`kbd-${keyIdx}`}
          className="inline-block rounded-md border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-neutral-800 shadow-2xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 mx-1"
        >
          {kbdText}
        </kbd>
      );
    }
    // Image: ![alt](url)
    else if (token.startsWith('![') && token.includes('](')) {
      const altMatch = token.match(/!\[(.*?)\]\((.*?)\)/);
      if (altMatch) {
        parts.push(
          <span key={`img-${keyIdx}`} className="block my-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={altMatch[2]}
              alt={altMatch[1]}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs max-h-96 w-auto mx-auto object-contain"
            />
            {altMatch[1] && (
              <span className="block text-center text-[11px] text-neutral-400 mt-1">
                {altMatch[1]}
              </span>
            )}
          </span>
        );
      }
    }
    // Link: [text](url)
    else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        const isInternal = linkUrl.startsWith('/');

        if (isInternal) {
          parts.push(
            <Link
              key={`link-${keyIdx}`}
              href={linkUrl}
              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
            >
              <span>{linkText}</span>
              <IconArrowUpRight size={12} className="inline" />
            </Link>
          );
        } else {
          parts.push(
            <a
              key={`link-${keyIdx}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
            >
              <span>{linkText}</span>
              <IconArrowUpRight size={12} className="inline" />
            </a>
          );
        }
      }
    }
    // Inline code: `code`
    else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`code-${keyIdx}`}
          className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-700 dark:bg-neutral-800 dark:text-brand-300 mx-0.5"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    // Bold: **bold**
    else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold-${keyIdx}`} className="font-bold text-neutral-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    // Italic: *italic*
    else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`italic-${keyIdx}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    // Strike: ~~strike~~
    else if (token.startsWith('~~') && token.endsWith('~~')) {
      parts.push(
        <s key={`strike-${keyIdx}`} className="line-through text-neutral-400">
          {token.slice(2, -2)}
        </s>
      );
    } else {
      parts.push(token);
    }

    remaining = remaining.substring(match.index + token.length);
  }

  return <>{parts}</>;
}

// GitHub Alert Box Component
function AlertBox({ type, content }: { type: string; content: string }) {
  const configs: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; label: string }> = {
    NOTE: {
      bg: 'bg-blue-50/70 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900/60',
      text: 'text-blue-900 dark:text-blue-300',
      icon: <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />,
      label: 'CATATAN',
    },
    TIP: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-900/60',
      text: 'text-emerald-900 dark:text-emerald-300',
      icon: <IconSparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      label: 'TIPS & TRIK',
    },
    IMPORTANT: {
      bg: 'bg-purple-50/70 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-900/60',
      text: 'text-purple-900 dark:text-purple-300',
      icon: <IconShieldLock className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />,
      label: 'PENTING',
    },
    WARNING: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-900/60',
      text: 'text-amber-900 dark:text-amber-300',
      icon: <IconAlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      label: 'PERINGATAN',
    },
    CAUTION: {
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-900/60',
      text: 'text-rose-900 dark:text-rose-300',
      icon: <IconAlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      label: 'PERHATIAN KHUSUS',
    },
  };

  const cfg = configs[type] || configs.NOTE;

  return (
    <div className={`my-4 rounded-2xl border p-4 ${cfg.bg} ${cfg.border} shadow-2xs`}>
      <div className="flex items-center gap-2 mb-1.5">
        {cfg.icon}
        <span className={`text-[11px] font-extrabold tracking-wider uppercase ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      <div className={`text-xs sm:text-sm leading-relaxed ${cfg.text}`}>
        {renderInlineMarkdown(content)}
      </div>
    </div>
  );
}

// Code Block with Copy Button
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Kode berhasil disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-neutral-800 text-xs">
        <span className="font-mono text-[11px] text-neutral-400 uppercase font-semibold">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          {copied ? <IconCheck size={13} className="text-emerald-400" /> : <IconCopy size={13} />}
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// GFM Markdown Table
function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  const parseRow = (line: string) => {
    return line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  };

  const headers = parseRow(lines[0]);
  // line 1 is separator |---|---|
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="my-4 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
      <table className="w-full text-xs text-left">
        <thead className="bg-neutral-50 text-neutral-700 font-bold border-b border-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} scope="col" className="px-4 py-3">
                {renderInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-850/40 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
