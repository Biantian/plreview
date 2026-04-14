"use client";

import { useId, useState } from "react";

type FilePickerProps = {
  badgeLabel?: string;
  description?: string;
  title?: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
};

export function FilePicker({
  badgeLabel = "支持 docx / txt / md",
  description = "当前支持 .docx、.txt、.md，后续批量导入会接到同一张 workbench 表格里。",
  title = "选择待导入文件",
  accept = ".docx,.txt,.md",
  multiple = false,
  onFilesSelected,
}: FilePickerProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState("尚未选择文件");

  return (
    <div className="upload-panel">
      <div>
        <p className="section-eyebrow">File Intake</p>
        <label htmlFor={inputId}>
          <strong>{title}</strong>
        </label>
        <p className="muted">{description}</p>
      </div>

      <input
        id={inputId}
        className="file-input"
        name="file"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);

          onFilesSelected?.(files);

          if (files.length === 0) {
            setFileName("尚未选择文件");
            return;
          }

          if (files.length === 1) {
            setFileName(files[0]?.name ?? "尚未选择文件");
            return;
          }

          setFileName(`已选择 ${files.length} 个文件`);
        }}
        required
      />

      <div className="upload-meta">
        <span className="pill pill-brand">{badgeLabel}</span>
        <div className="hint">当前选择：{fileName}</div>
      </div>
    </div>
  );
}
