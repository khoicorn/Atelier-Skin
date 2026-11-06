import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn("peer h-5 w-5 shrink-0 rounded-md border border-black/20 bg-white/70 transition-colors data-[state=checked]:border-sage data-[state=checked]:bg-sage data-[state=checked]:text-white", className)} {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check className="h-3.5 w-3.5" strokeWidth={2} /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
