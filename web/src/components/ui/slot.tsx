import { Slot } from "@radix-ui/react-slot"
import { forwardRef } from "react"

export const SlotPrimitive = forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => (
  <Slot ref={ref} {...props} />
))
SlotPrimitive.displayName = "SlotPrimitive"
