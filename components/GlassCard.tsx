import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, action }) => {
  return (
    <div
      className={`
      bg-white
      border border-black/5
      rounded-2xl
      shadow-[0_1px_3px_rgba(2,48,71,0.08)]
      p-4 sm:p-6
      ${className}
    `}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 border-b border-black/5">
          {title && <h3 className="text-sm sm:text-base font-bold text-brand-navy">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};