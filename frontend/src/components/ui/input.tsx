/**
 * DOCU: Provides the shared styled text input primitive adhering to shadcn dark mode.
 * Last Updated Date: September 8, 2026
 * @returns A reusable styled text input.
 * @author Keith
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface IInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground/90 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-card/60 px-3 py-1 text-sm text-foreground shadow-2xs transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
