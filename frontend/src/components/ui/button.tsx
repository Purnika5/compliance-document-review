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
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80",
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80",
        navy:
          "bg-transparent text-foreground hover:bg-[#062a20] hover:text-[#54d0a2] border border-border transition-colors",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-[#062a20] hover:text-[#54d0a2] hover:border-emerald-800/60 text-foreground shadow-2xs transition-colors",
        secondary:
          "bg-transparent text-foreground hover:bg-[#062a20] hover:text-[#54d0a2] hover:border-emerald-800/60 border border-border/50 transition-colors",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors",
        link:
          "text-[#54d0a2] underline-offset-4 hover:underline hover:text-[#90d22d]",
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
