import { type ButtonHTMLAttributes, forwardRef } from "react"
import { Button as UIButton } from "@/components/ui/button"

type CommonVariant = "primary" | "secondary" | "ghost" | "danger"
type CommonSize = "sm" | "md" | "lg"

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: CommonVariant
  size?: CommonSize
  loading?: boolean
  fullWidth?: boolean
  asChild?: boolean
}

const VARIANT_MAP: Record<CommonVariant, "default" | "secondary" | "ghost" | "destructive"> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
}

const SIZE_MAP: Record<CommonSize, "sm" | "default" | "lg"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className = "",
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <UIButton
        ref={ref}
        variant={VARIANT_MAP[variant]}
        size={SIZE_MAP[size]}
        loading={loading}
        asChild={asChild}
        disabled={disabled}
        className={`${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {children}
      </UIButton>
    )
  },
)
Button.displayName = "Button"
