/**
 * DOCU: Provides the shared button primitive and its visual variants adhering to shadcn dark mode.
 * Last Updated Date: September 8, 2026
 * @returns A reusable styled button primitive.
 * @author Keith
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,box-shadow,border-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#183028] text-white shadow-xs hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] font-semibold transition-all cursor-pointer",
        primary:
          "bg-[#183028] text-white shadow-xs hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] font-semibold transition-all cursor-pointer",
        navy:
          "bg-transparent text-[#183028] hover:bg-[#C5E86C]/20 border border-[#E6E8E7] transition-colors",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-[#E6E8E7] bg-white hover:bg-[#C5E86C]/20 text-[#183028] shadow-2xs transition-colors cursor-pointer",
        secondary:
          "bg-white text-[#183028] hover:bg-[#C5E86C]/20 border border-[#E6E8E7] transition-colors cursor-pointer",
        ghost:
          "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028] transition-colors cursor-pointer",
        link:
          "text-[#183028] underline-offset-4 hover:underline hover:text-[#183028]/80",
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
