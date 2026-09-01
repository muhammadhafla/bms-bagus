'use client';

import React, {
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  IconChevronDown,
  IconCheck,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

type InputSize = 'sm' | 'md' | 'lg';

export interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  inputSize?: InputSize;
  searchable?: boolean;
  clearable?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SelectInput = forwardRef<HTMLInputElement, SelectInputProps>(
  (
    {
      value,
      onChange,
      options = [],
      label,
      error,
      helperText,
      placeholder = 'Pilih...',
      searchPlaceholder = 'Cari...',
      emptyMessage = 'Tidak ada opsi yang sesuai',
      searchable,
      clearable,
      name,
      id,
      required,
      disabled,
      className = '',
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const isDesktop = useMediaQuery('(min-width: 640px)');
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Filter out duplicates and separate empty/reset option
    const { emptyOption, cleanOptions } = useMemo<{
      emptyOption: SelectOption | null;
      cleanOptions: SelectOption[];
    }>(() => {
      let emptyOpt: SelectOption | null = null;
      const seen = new Set<string>();
      const nonEmpties: SelectOption[] = [];

      options.forEach((opt) => {
        if (opt.value === '') {
          if (!emptyOpt) {
            emptyOpt = opt;
          }
        } else if (!seen.has(opt.value)) {
          seen.add(opt.value);
          nonEmpties.push(opt);
        }
      });

      return { emptyOption: emptyOpt, cleanOptions: nonEmpties };
    }, [options]);

    // Active selected option
    const selectedOption = useMemo(() => {
      if (!value) return null;
      return cleanOptions.find((opt) => String(opt.value) === String(value)) || null;
    }, [cleanOptions, value]);

    // Auto determine if search bar should appear (if > 5 non-empty items or prop explicitly set)
    const showSearch = searchable !== undefined ? searchable : cleanOptions.length > 5;

    // Filter options by search query
    const filteredOptions = useMemo(() => {
      if (!search.trim()) return cleanOptions;
      const q = search.toLowerCase().trim();
      return cleanOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
          (opt.badge && opt.badge.toLowerCase().includes(q)),
      );
    }, [cleanOptions, search]);

    // Close on click outside (Desktop)
    useEffect(() => {
      if (!isOpen || !isDesktop) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isDesktop]);

    // Reset search & highlighted index when dropdown closes or opens
    useEffect(() => {
      if (isOpen) {
        setSearch('');
        setHighlightedIndex(-1);
        if (isDesktop && showSearch) {
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }
    }, [isOpen, isDesktop, showSearch]);

    // Handle selection
    const handleSelect = useCallback(
      (val: string) => {
        onChange(val);
        setIsOpen(false);
        triggerRef.current?.focus();
      },
      [onChange],
    );

    // Handle clear
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        triggerRef.current?.focus();
      },
      [onChange],
    );

    // Keyboard navigation for desktop
    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleMenuKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const item = filteredOptions[highlightedIndex];
          if (!item.disabled) {
            handleSelect(item.value);
          }
        }
      }
    };

    // Determine if clear button is allowed
    const isClearable = (clearable ?? !required) && !!value && !disabled;

    // Has display content
    const hasValue = !!value && !!selectedOption;
    const showFloatingLabel = !!label;

    return (
      <div ref={containerRef} className={`w-full space-y-1.5 ${className}`}>
        {/* Hidden input for form submission compatibility */}
        <input
          ref={ref}
          type="hidden"
          name={name}
          id={inputId}
          value={value || ''}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
        />

        <div className="group relative w-full">
          {/* Main Trigger Button */}
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            onKeyDown={handleTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${inputId}-label` : undefined}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            className={`relative flex w-full items-center justify-between rounded-xl border-2 text-left transition-all outline-none ${
              label ? 'pt-6 pb-2 min-h-[56px]' : 'py-3 min-h-[46px]'
            } pl-4 pr-10 cursor-pointer ${
              error
                ? 'border-accent-rose-400 focus:border-accent-rose-500 bg-accent-rose-50/30 shadow-[0_0_0_1px_rgba(244,63,94,0.1)]'
                : isOpen
                ? 'border-brand-500 bg-white shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-brand-400 dark:bg-neutral-950'
                : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100/50 focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60 dark:focus:border-brand-400 dark:focus:bg-neutral-950'
            } text-neutral-900 dark:text-neutral-100 ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {/* Selected Value Text & Optional Icon/Badge */}
            <div className="flex flex-1 items-center gap-2 overflow-hidden pr-2">
              {hasValue ? (
                <>
                  {selectedOption?.icon && (
                    <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
                      {selectedOption.icon}
                    </span>
                  )}
                  <span className="truncate text-sm sm:text-base font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedOption?.label}
                  </span>
                  {selectedOption?.badge && (
                    <span className="shrink-0 rounded-md bg-neutral-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {selectedOption.badge}
                    </span>
                  )}
                </>
              ) : (
                <span
                  className={`truncate text-sm sm:text-base ${
                    showFloatingLabel && !isOpen
                      ? 'opacity-0'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {placeholder}
                </span>
              )}
            </div>

            {/* Right Actions: Clear Button & Chevron */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isClearable && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClear(e as any);
                    }
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
                  title="Kosongkan pilihan"
                  aria-label="Kosongkan pilihan"
                >
                  <IconX className="h-3.5 w-3.5" />
                </span>
              )}
              <IconChevronDown
                className={`h-5 w-5 text-neutral-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : ''
                }`}
              />
            </div>
          </button>

          {/* Floating / Static Label */}
          {label && (
            <label
              id={`${inputId}-label`}
              onClick={() => triggerRef.current?.focus()}
              className={`pointer-events-none absolute left-4 max-w-[calc(100%-4rem)] truncate transition-all tracking-wide uppercase ${
                hasValue || isOpen
                  ? 'top-2 -translate-y-0 text-[11px] font-semibold'
                  : 'top-1/2 -translate-y-1/2 text-sm sm:text-base font-normal'
              } ${
                error
                  ? 'text-accent-rose-500'
                  : isOpen
                  ? 'text-brand-500 dark:text-brand-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {label}
              {required && <span className="text-accent-rose-500 ml-1">*</span>}
            </label>
          )}

          {/* Desktop Floating Popover */}
          {isOpen && isDesktop && (
            <div
              onKeyDown={handleMenuKeyDown}
              className="animate-fade-in-up absolute left-0 top-full z-[120] mt-1.5 w-full min-w-[220px] rounded-2xl border border-neutral-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md dark:border-neutral-800/90 dark:bg-neutral-900/95"
            >
              {/* Optional Search Bar */}
              {showSearch && (
                <div className="p-1 pb-1.5 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                  <div className="relative flex items-center">
                    <IconSearch
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      size={16}
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full rounded-xl bg-neutral-100/80 py-2 pl-9 pr-8 text-xs font-medium text-neutral-900 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800/70 dark:text-neutral-100 dark:focus:bg-neutral-950"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <IconX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Options List */}
              <div
                ref={listRef}
                role="listbox"
                className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain"
              >
                {/* Reset / Empty Option (if available or optional without search) */}
                {(!required || emptyOption) && !search && (
                  <button
                    type="button"
                    onClick={() => handleSelect('')}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                      !value
                        ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                        : 'text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200'
                    }`}
                  >
                    <span className="truncate italic">
                      {emptyOption?.label || `Tanpa ${label || 'Pilihan'}`}
                    </span>
                    {!value && <IconCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
                  </button>
                )}

                {/* Filtered Non-Empty Options */}
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt, index) => {
                    const isSelected = String(value) === String(opt.value);
                    const isHighlighted = highlightedIndex === index;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt.value)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all ${
                          opt.disabled
                            ? 'cursor-not-allowed opacity-40'
                            : isSelected
                            ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                            : isHighlighted
                            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                            : 'text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-100'
                        }`}
                      >
                        <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
                          {opt.icon && (
                            <span className="shrink-0 text-neutral-400 dark:text-neutral-500">
                              {opt.icon}
                            </span>
                          )}
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate">{opt.label}</span>
                            {opt.sublabel && (
                              <span className="truncate text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                                {opt.sublabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {opt.badge && (
                            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && (
                            <IconCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 px-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Sheet Drawer (vaul) */}
        {mounted && !isDesktop && (
          <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
            }}
          >
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs animate-fade-in" />
              <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[131] flex max-h-[85vh] flex-col rounded-t-3xl bg-white outline-none dark:bg-neutral-950 shadow-2xl">
                {/* Grab Handle */}
                <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />

                {/* Header */}
                <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <Drawer.Title className="text-base font-bold text-neutral-900 dark:text-white">
                    {label || placeholder || 'Pilih Opsi'}
                  </Drawer.Title>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Bar on Mobile */}
                {showSearch && (
                  <div className="p-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="relative">
                      <IconSearch
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-xl bg-neutral-100 py-3 pl-10 pr-9 text-sm font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <IconX size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List on Mobile */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                  {/* Reset / Empty Option */}
                  {(!required || emptyOption) && !search && (
                    <button
                      type="button"
                      onClick={() => handleSelect('')}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm transition-colors ${
                        !value
                          ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900'
                      }`}
                    >
                      <span className="truncate italic">
                        {emptyOption?.label || `Tanpa ${label || 'Pilihan'}`}
                      </span>
                      {!value && (
                        <IconCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                      )}
                    </button>
                  )}

                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => {
                      const isSelected = String(value) === String(opt.value);

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => handleSelect(opt.value)}
                          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm transition-colors ${
                            opt.disabled
                              ? 'cursor-not-allowed opacity-40'
                              : isSelected
                              ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                              : 'text-neutral-800 hover:bg-neutral-100/70 active:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-800'
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-3 overflow-hidden">
                            {opt.icon && (
                              <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
                                {opt.icon}
                              </span>
                            )}
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate text-base">{opt.label}</span>
                              {opt.sublabel && (
                                <span className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                                  {opt.sublabel}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {opt.badge && (
                              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                {opt.badge}
                              </span>
                            )}
                            {isSelected && (
                              <IconCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-12 px-4 text-center text-sm text-neutral-400 dark:text-neutral-500">
                      {emptyMessage}
                    </div>
                  )}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-accent-rose-600 dark:text-accent-rose-400 animate-fade-in-up pl-1 text-xs"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="pl-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

SelectInput.displayName = 'SelectInput';

export default SelectInput;
