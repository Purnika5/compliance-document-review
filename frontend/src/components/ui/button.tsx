/**
 * DOCU: Provides the shared button primitive and its visual variants.
 * Last Updated Date: September 3, 2026
 * @returns A reusable styled button primitive.
 * @author Keith
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-white shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.7)] hover:bg-slate-800 active:bg-slate-950 active:shadow-inner",
        primary: "bg-primary text-primary-foreground shadow-[3px_3px_9px_hsl(228_42%_74%_/_0.55)] hover:bg-primary/90 active:shadow-inner",
        navy: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-rose-600 text-white shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.7)] hover:bg-rose-700 active:bg-rose-800 active:shadow-inner",
        outline:
          "border border-slate-300 bg-background text-slate-800 shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.55),-3px_-3px_7px_hsl(0_0%_100%_/_0.7)] hover:bg-slate-100 hover:text-slate-900 active:shadow-inner",
        secondary:
          "bg-slate-100 text-slate-900 shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.55),-3px_-3px_7px_hsl(0_0%_100%_/_0.7)] hover:bg-slate-200 active:bg-slate-300 active:shadow-inner",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none",
        link:
          "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-9 px-4 py-2 text-sm",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface IButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isPending?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, IButtonProps>(
  ({ className, variant, size, asChild = false, isPending = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isPending}
        {...props}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
