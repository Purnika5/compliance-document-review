/**
 * DOCU: Provides the shared styled multiline text input primitive.
 * Last Updated Date: September 3, 2026
 * @returns A reusable styled textarea primitive.
 * @author Keith
 */
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-[#E6E8E7] bg-white text-[#183028] px-3 py-2 text-base shadow-2xs transition-[color,box-shadow] outline-none placeholder:text-[#183028]/45 focus-visible:border-[#183028] focus-visible:ring-[1px] focus-visible:ring-[#183028] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-white dark:text-[#183028] dark:border-[#E6E8E7]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
