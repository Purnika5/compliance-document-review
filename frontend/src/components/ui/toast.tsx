"use client";

/**
 * DOCU: Provides global toast notifications with custom success, error, and info styling.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import React from "react";
import toast, {
  Toaster as RhtToaster,
  ToastBar,
  type Toast,
} from "react-hot-toast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastOptions {
  duration?: number;
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
}

export interface ToastData {
  header: string;
  subheader?: string;
}

/**
 * DOCU: Creates and triggers a standardized toast notification.
 * Last Updated Date: September 7, 2026
 * @param header - Main bold title of the notification.
 * @param subheader - Optional descriptive subheader message.
 * @param options - Duration and position overrides.
 * @param toastFn - Underlying react-hot-toast trigger function.
 * @returns Generated toast ID.
 * @author Keith
 */
const createToast = (
  header: string,
  subheader?: string,
  options?: ToastOptions,
  toastFn: (message: string, options?: Record<string, unknown>) => string = toast
) => {
  const message = `${header}${subheader ? `|${subheader}` : ""}`;
  return toastFn(message, {
    duration: options?.duration || 4000,
    position: options?.position || "top-center",
  });
};

/**
 * DOCU: Triggers a green success notification toast.
 * Last Updated Date: September 8, 2026
 * @param header - Success title text.
 * @param subheader - Optional detailed success message.
 * @param options - Toast display configuration.
 * @returns Toast ID string.
 * @author Keith
 */
export const showSuccessToast = (
  header: string,
  subheader?: string,
  options?: ToastOptions
) => createToast(header, subheader, options, toast.success as (message: string, options?: Record<string, unknown>) => string);

/**
 * DOCU: Triggers a red error notification toast.
 * Last Updated Date: September 8, 2026
 * @param header - Error title text.
 * @param subheader - Optional detailed error explanation.
 * @param options - Toast display configuration.
 * @returns Toast ID string.
 * @author Keith
 */
export const showErrorToast = (
  header: string,
  subheader?: string,
  options?: ToastOptions
) => createToast(header, subheader, options, toast.error as (message: string, options?: Record<string, unknown>) => string);

/**
 * DOCU: Triggers an informational blue notification toast.
 * Last Updated Date: September 8, 2026
 * @param header - Information title text.
 * @param subheader - Optional detailed info explanation.
 * @param options - Toast display configuration.
 * @returns Toast ID string.
 * @author Keith
 */
export const showInfoToast = (
  header: string,
  subheader?: string,
  options?: ToastOptions
) => createToast(header, subheader, options);

/**
 * DOCU: Parses serialized pipe-delimited message into header and subheader fields.
 * Last Updated Date: September 8, 2026
 * @param message - Serialized string or ReactNode payload.
 * @returns Parsed ToastData object.
 * @author Keith
 */
const parseToastMessage = (message: unknown): ToastData => {
  const message_string =
    typeof message === "string"
      ? message
      : message &&
        typeof message === "object" &&
        "props" in message &&
        typeof (message as { props?: { children?: unknown } }).props?.children === "string"
      ? String((message as { props: { children: unknown } }).props.children)
      : "Notification";

  const parts = message_string.split("|");
  return {
    header: parts[0],
    subheader: parts[1] || undefined,
  };
};

/** Icon and color config per toast type */
const TOAST_CONFIG = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
    iconBg: "bg-primary/15 ring-1 ring-primary/30",
    accent: "bg-primary",
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-rose-400" />,
    iconBg: "bg-rose-500/15 ring-1 ring-rose-500/30",
    accent: "bg-rose-500",
  },
  default: {
    icon: <Info className="h-4 w-4 text-accent-foreground" />,
    iconBg: "bg-accent/15 ring-1 ring-accent/30",
    accent: "bg-accent",
  },
};

/**
 * DOCU: Renders the circular badge icon wrapper based on toast semantic variant.
 * Last Updated Date: September 8, 2026
 * @param props - Toast instance and icon config.
 * @returns Rendered icon container.
 * @author Keith
 */
const ToastIconBadge = ({ t }: { t: Toast }) => {
  const config =
    t.type === "success"
      ? TOAST_CONFIG.success
      : t.type === "error"
      ? TOAST_CONFIG.error
      : TOAST_CONFIG.default;

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform",
        config.iconBg
      )}
    >
      {config.icon}
    </div>
  );
};

/**
 * DOCU: Renders the structured title and subheader text inside a toast notification.
 * Last Updated Date: September 8, 2026
 * @param props - Parsed toast data containing header and subheader.
 * @returns Toast text container.
 * @author Keith
 */
const ToastContent = ({ toast_data }: { toast_data: ToastData }) => (
  <div className="flex-1 text-left min-w-0">
    <div className="text-xs font-bold text-foreground leading-tight">
      {toast_data.header}
    </div>
    {toast_data.subheader && (
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
        {toast_data.subheader}
      </div>
    )}
  </div>
);

export interface ToastProviderProps {
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
}

/**
 * DOCU: Global Toaster provider rendering formatted toast notifications in the top viewport.
 * Last Updated Date: September 8, 2026
 * @returns The RhtToaster component tree.
 * @author Keith
 */
export const ToastProvider = ({ position = "top-center" }: ToastProviderProps) => {
  return (
    <RhtToaster
      position={position}
      containerStyle={{
        top: 20,
        zIndex: 99999,
      }}
      toastOptions={{
        duration: 4500,
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
          padding: "0",
          maxWidth: "420px",
          boxShadow: "0 12px 30px -6px rgba(0,0,0,0.6), 0 4px 12px -2px rgba(0,0,0,0.4)",
        },
        success: {
          iconTheme: { primary: "hsl(var(--primary))", secondary: "#FFFFFF" },
        },
        error: {
          iconTheme: { primary: "#f43f5e", secondary: "#FFFFFF" },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t} position={t.position || position}>
          {({ message }) => {
            const toast_data = parseToastMessage(message);
            const config =
              t.type === "success"
                ? TOAST_CONFIG.success
                : t.type === "error"
                ? TOAST_CONFIG.error
                : TOAST_CONFIG.default;

            return (
              <div className="flex w-full min-w-[320px] items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden text-card-foreground">
                <ToastIconBadge t={t} />
                <ToastContent toast_data={toast_data} />

                {/* Close button */}
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Bottom accent bar */}
                <div
                  className={cn("absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl", config.accent)}
                />
              </div>
            );
          }}
        </ToastBar>
      )}
    </RhtToaster>
  );
};

export default {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  ToastProvider,
};
