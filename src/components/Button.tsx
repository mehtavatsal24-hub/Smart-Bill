import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, className, children, ...props }, ref) => {
    const variants = {
      primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-95",
      secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:scale-95",
      outline: "bg-transparent border border-zinc-200 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95",
      ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 active:scale-95",
    };

    const sizes = {
      sm: "px-4 py-2 text-xs rounded-xl",
      md: "px-5 py-2.5 text-sm rounded-xl",
      lg: "px-8 py-4 text-base rounded-2xl",
      icon: "p-2.5 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
