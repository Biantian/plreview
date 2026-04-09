import { ReviewStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const statusMap: Record<ReviewStatus, string> = {
  pending: "待处理",
  running: "评审中",
  completed: "已完成",
  partial: "部分完成",
  failed: "失败",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={cn("status-badge", `status-${status}`)}>
      {statusMap[status]}
    </span>
  );
}
