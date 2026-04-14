import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "未开始";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function severityLabel(
  severity: "low" | "medium" | "high" | "critical" | string,
) {
  switch (severity) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    case "critical":
      return "严重";
    default:
      return severity;
  }
}

export function reviewStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "待处理";
    case "running":
      return "评审中";
    case "completed":
      return "已完成";
    case "partial":
      return "部分完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
}
