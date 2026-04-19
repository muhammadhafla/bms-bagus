'use client';

import React from 'react';

type CardVariant = 'elevated' | 'outlined' | 'flat';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  elevated: 'shadow-card',
  outlined: 'border border-neutral-200 dark:border-neutral-800',
  flat: '',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'outlined',
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={[
        'bg-white dark:bg-neutral-900 rounded-xl',
        variantStyles[variant],
        paddingStyles[padding],
        hover && 'card-hover',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-lg font-semibold text-neutral-900 dark:text-neutral-100 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-sm text-neutral-500 dark:text-neutral-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;