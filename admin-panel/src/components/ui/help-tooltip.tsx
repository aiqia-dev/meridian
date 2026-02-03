"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
}

export function HelpTooltip({ content, className, iconClassName }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="Help"
      >
        <HelpCircle className={cn("w-4 h-4", iconClassName)} />
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-popover-foreground bg-popover border rounded-md shadow-md max-w-[280px] whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  );
}

interface LabelWithHelpProps {
  htmlFor?: string;
  children: React.ReactNode;
  help: string;
  className?: string;
}

export function LabelWithHelp({ htmlFor, children, help, className }: LabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
      </label>
      <HelpTooltip content={help} />
    </div>
  );
}
