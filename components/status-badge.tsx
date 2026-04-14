import { ReviewStatus } from "@prisma/client";

import { cn, reviewStatusLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={cn("status-badge", `status-${status}`)}>
      {status === ReviewStatus.pending || status === ReviewStatus.running ? (
        <span aria-hidden="true" className="status-badge-signal" />
      ) : null}
      {reviewStatusLabel(status)}
    </span>
  );
}
