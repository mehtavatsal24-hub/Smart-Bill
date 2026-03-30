import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, prefix, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors">
              {icon}
            </div>
          )}
          {prefix && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 pointer-events-none group-focus-within:text-brand-500 transition-colors">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            onWheel={(e) => props.type === "number" && e.currentTarget.blur()}
            className={cn(
              "w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm transition-all duration-200",
              icon ? "pl-11" : prefix ? "pl-10" : "px-4",
              "focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500",
              "placeholder:text-zinc-300 placeholder:font-medium",
              "hover:border-zinc-300",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
            value={props.value ?? ""}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
