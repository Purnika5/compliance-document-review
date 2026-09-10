/**
 * DOCU: Provides accessible alert messaging with semantic dark variants.
 * Last Updated Date: September 8, 2026
 * @returns Alert primitives for status and feedback messages.
 * @author Keith
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-3.5 sm:p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 text-sm overflow-hidden animate-fade-in shadow-xs",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-foreground [&>svg]:text-muted-foreground border-l-3 border-l-muted-foreground/60",
        destructive:
          "border-rose-900/50 bg-rose-950/30 text-rose-200 [&>svg]:text-rose-400 border-l-3 border-l-rose-500",
        error:
          "border-rose-900/50 bg-rose-950/30 text-rose-200 [&>svg]:text-rose-400 border-l-3 border-l-rose-500",
        warning:
          "border-amber-900/50 bg-amber-950/30 text-amber-200 [&>svg]:text-amber-400 border-l-3 border-l-amber-500",
        success:
          "border-emerald-900/50 bg-emerald-950/30 text-emerald-200 [&>svg]:text-emerald-400 border-l-3 border-l-emerald-500",
        info:
          "border-sky-900/50 bg-sky-950/30 text-sky-200 [&>svg]:text-sky-400 border-l-3 border-l-sky-500",
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
    className={cn("mb-1 font-semibold leading-none tracking-tight text-foreground", className)}
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
