/**
 * DOCU: Provides typed radio-group controls for option selection.
 * Last Updated Date: September 3, 2026
 * @returns Reusable radio-group controls.
 * @author Keith
 */
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-slate-900 text-slate-900 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export interface IRadioOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface IRadioGroupProps<T extends string = string> {
  name: string;
  options: IRadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  error?: string;
  className?: string;
}

function LegacyRadioGroup<T extends string = string>({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className,
}: IRadioGroupProps<T>) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex flex-col p-3.5 border rounded-lg cursor-pointer transition-all focus-within:ring-2 focus-within:ring-slate-950 shadow-xs",
                isSelected
                  ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange(option.value)}
                  className="h-4 w-4 text-slate-900 focus:ring-slate-950 border-slate-300"
                />
              </div>
              {option.description && (
                <span className="mt-1 text-xs text-slate-500">{option.description}</span>
              )}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export { RadioGroup, RadioGroupItem, LegacyRadioGroup as CustomRadioGroup };
