/**
 * DOCU: Provides accessible alert messaging with semantic variants.
 * Last Updated Date: September 7, 2026
 * @returns Alert primitives for status and feedback messages.
 * @author Keith
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 text-sm overflow-hidden animate-fade-in",
  {
    variants: {
      variant: {
        default:
          "bg-white text-slate-950 border-slate-200 [&>svg]:text-slate-950 border-l-4 border-l-slate-300",
        destructive:
          "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600 border-l-4 border-l-red-500",
        error:
          "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600 border-l-4 border-l-red-500",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600 border-l-4 border-l-amber-500",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600 border-l-4 border-l-emerald-500",
        info:
          "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600 border-l-4 border-l-blue-500",
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
}

const Alert = React.forwardRef<HTMLDivElement, IAlertProps>(
  ({ className, variant = "error", title, message, children, ...props }, ref) => {
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
    className={cn("mb-1 font-semibold leading-none tracking-tight text-slate-900", className)}
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
    className={cn("text-xs leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
