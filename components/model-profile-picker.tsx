"use client";

import { useEffect, useState } from "react";

type ProfileOption = {
  id: string;
  name: string;
  provider: string;
  defaultModel: string;
  modelOptions: string[];
  ready: boolean;
  mode: "live" | "demo";
};

export function ModelProfilePicker({ profiles }: { profiles: ProfileOption[] }) {
  const firstAvailableProfile = profiles.find((profile) => profile.ready) ?? profiles[0];
  const [selectedId, setSelectedId] = useState(firstAvailableProfile?.id ?? "");
  const selected = profiles.find((profile) => profile.id === selectedId) ?? firstAvailableProfile;
  const [modelName, setModelName] = useState(selected?.defaultModel ?? "");

  useEffect(() => {
    setModelName(selected?.defaultModel ?? "");
  }, [selected?.id, selected?.defaultModel]);

  return (
    <div className="form-grid two">
      <div className="field">
        <label htmlFor="llmProfileId">模型配置</label>
        <select
          id="llmProfileId"
          name="llmProfileId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          {profiles.map((profile) => (
            <option disabled={!profile.ready} key={profile.id} value={profile.id}>
              {profile.name} · {profile.provider} ·{" "}
              {profile.mode === "demo" ? "演示模式" : profile.ready ? "已就绪" : "未就绪"}
            </option>
          ))}
        </select>
        <p className="muted">
          {selected?.mode === "demo"
            ? "当前配置为演示模式，会生成示例评审结果。"
            : selected?.ready
              ? "当前配置已就绪，会调用对应供应商的真实模型。"
              : "当前配置缺少 API Key，请先到模型设置页补全。"}
        </p>
      </div>

      <div className="field">
        <label htmlFor="modelName">模型名称</label>
        <input
          id="modelName"
          list="model-options"
          name="modelName"
          onChange={(event) => setModelName(event.target.value)}
          value={modelName}
        />
        <datalist id="model-options">
          {(selected?.modelOptions ?? []).map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
