"use client";

import { useState } from "react";

export function FilePicker() {
  const [fileName, setFileName] = useState("尚未选择文件");

  return (
    <div className="upload-panel">
      <div>
        <p className="section-eyebrow">File Intake</p>
        <strong>上传策划案</strong>
        <p className="muted">
          当前支持 <code>.docx</code>、<code>.txt</code>、<code>.md</code>。
        </p>
      </div>

      <input
        className="file-input"
        name="file"
        type="file"
        accept=".docx,.txt,.md"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          setFileName(nextFile?.name ?? "尚未选择文件");
        }}
        required
      />

      <div className="upload-meta">
        <span className="pill pill-brand">支持 docx / txt / md</span>
        <div className="hint">当前文件：{fileName}</div>
      </div>
    </div>
  );
}
