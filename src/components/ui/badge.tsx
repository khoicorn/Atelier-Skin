import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border border-black/10 bg-white/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-ink/65", className)} {...props} />;
}
