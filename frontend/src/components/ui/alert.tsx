/**
 * DOCU: Provides accessible alert messaging with semantic dark variants.
 * Last Updated Date: September 8, 2026
 * @returns Alert primitives for status and feedback messages.
 * @author Keith
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-3.5 sm:p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 text-sm overflow-hidden animate-fade-in shadow-2xs",
  {
    variants: {
      variant: {
        default:
          "border-[#E6E8E7] bg-[#FFFFFF] text-[#183028] [&>svg]:text-[#183028] border-l-4 border-l-[#183028]",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-950 [&>svg]:text-rose-600 border-l-4 border-l-rose-600",
        error:
          "border-rose-200 bg-rose-50 text-rose-950 [&>svg]:text-rose-600 border-l-4 border-l-rose-600",
        warning:
          "border-amber-200 bg-amber-50 text-amber-950 [&>svg]:text-amber-600 border-l-4 border-l-amber-600",
        success:
          "border-[#C5E86C] bg-[#C5E86C]/20 text-[#183028] [&>svg]:text-[#183028] border-l-4 border-l-[#183028]",
        info:
          "border-sky-200 bg-sky-50 text-sky-950 [&>svg]:text-sky-600 border-l-4 border-l-sky-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const alertIcons = {
  default:     AlertCircle,
  destructive: AlertCircle,
  error:       AlertCircle,
  warning:     AlertTriangle,
  success:     CheckCircle2,
  info:        Info,
};

export interface IAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  message?: string;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, IAlertProps>(
  ({ className, variant = "error", title, message, onClose, children, ...props }, ref) => {
    const IconComponent = alertIcons[variant || "default"] || AlertCircle;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <IconComponent className="h-4 w-4" />
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{message || children}</AlertDescription>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 p-1 rounded-md text-[#183028]/40 hover:text-[#183028] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-bold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed opacity-95 font-medium", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
