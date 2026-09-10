import { type HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "confirmed"
    | "reported"
    | "estimated"
    | "unknown"
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info";
  size?: "sm" | "md";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = "default", size = "md", className = "", children, ...props },
    ref,
  ) => {
    const variantClasses = {
      confirmed: "badge-confirmed",
      reported: "badge-reported",
      estimated: "badge-estimated",
      unknown: "badge-unknown",
      default: "badge bg-surface-100 text-surface-700",
      success: "badge bg-green-100 text-green-800",
      warning: "badge bg-yellow-100 text-yellow-800",
      danger: "badge bg-red-100 text-red-800",
      info: "badge bg-blue-100 text-blue-800",
    };
    const sizeClasses = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-2.5 py-0.5 text-xs",
    };

    return (
      <span
        ref={ref}
        className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: "CONFIRMED" | "REPORTED" | "ESTIMATED" | "UNKNOWN";
  size?: "sm" | "md";
}) {
  const variantMap = {
    CONFIRMED: "confirmed" as const,
    REPORTED: "reported" as const,
    ESTIMATED: "estimated" as const,
    UNKNOWN: "unknown" as const,
  };

  return (
    <Badge variant={variantMap[status]} size={size}>
      {status}
    </Badge>
  );
}
