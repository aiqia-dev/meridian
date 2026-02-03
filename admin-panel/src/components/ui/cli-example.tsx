"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CliExampleProps {
  title?: string;
  description?: string;
  commands: Array<{
    label?: string;
    command: string;
    description?: string;
  }>;
  className?: string;
}

export function CliExample({ title, description, commands, className }: CliExampleProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title || "CLI Examples"}</h3>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}

      <div className="space-y-3">
        {commands.map((cmd, index) => (
          <div key={index} className="space-y-1">
            {cmd.label && (
              <p className="text-xs font-medium text-muted-foreground">{cmd.label}</p>
            )}
            <div className="relative group">
              <pre className="bg-background border rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                <code>{cmd.command}</code>
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(cmd.command, index)}
              >
                {copiedIndex === index ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            {cmd.description && (
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
