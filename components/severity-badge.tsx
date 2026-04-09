import { Severity } from "@prisma/client";

import { cn, severityLabel } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("severity-badge", `severity-${severity}`)}>
      {severityLabel(severity)}
    </span>
  );
}
