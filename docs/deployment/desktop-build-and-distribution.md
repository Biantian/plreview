# Desktop Build And Distribution

本页记录桌面应用的构建、打包与平台分发说明，面向需要维护 Electron 产物、执行本地分发验证或准备正式发布的开发者。

## 构建与本地打包

### 构建桌面产物

```bash
npm run desktop:build
```

该命令会依次完成：

- 渲染层静态构建
- 桌面运行时构建

### 生成本地分发产物

```bash
npm run desktop:dist
```

打包配置位于 [electron-builder.yml](../../electron-builder.yml)，产物默认输出到 `release/`。

当前打包链路要点：

- `next.config.ts` 使用 `output: "export"` 生成静态 `out/`
- 开发环境由 Electron 加载 `http://localhost:3000`
- 生产环境由 Electron 直接加载 `out/index.html`
- 页面数据通过 `electron/preload` 暴露的桌面 bridge 进入渲染层
- 首次启动时会把预置 SQLite 模板复制到 Electron `userData` 目录，并在同目录生成持久化的 `APP_ENCRYPTION_KEY`

## 构建后检查

### 查看产物体积

```bash
npm run desktop:report-size
```

### 回归桌面核心链路

```bash
npm run test:desktop:smoke
```

详细回归说明见 [../qa/2026-04-21-desktop-smoke-regression.md](../qa/2026-04-21-desktop-smoke-regression.md)。

## macOS 分发

### 非正式分发

适用于小范围内部试装，不适合作为正式对外交付方案。

```bash
npm run desktop:dist -- --mac dmg --arm64
```

如果下载后的应用被系统拦截，可在目标机器执行：

```bash
xattr -dr com.apple.quarantine /Applications/PLReview.app
```

### 正式发布

正式对外分发需要：

- `Developer ID Application` 证书
- `electron-builder` 可用的签名来源
- 一组可用的 Apple notarization 凭据

正式打包命令：

```bash
npm run desktop:release:mac
```

如需复验当前 `release/` 下的 macOS 产物：

```bash
npm run desktop:verify:mac-release
```

对应的底层校验命令通常是：

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/PLReview.app
spctl -a -vv release/mac-arm64/PLReview.app
xcrun stapler validate release/PLReview-<version>-arm64.dmg
```

## Win11 打包

在当前环境下可使用：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npm run desktop:dist -- --win --x64 --dir
```

如果需要正式安装包 `nsis`，更建议直接在 Win11 主机上执行：

```bash
npm run desktop:dist -- --win --x64
```

Win11 手工烟测步骤见 [../qa/2026-04-14-win11-smoke-test-checklist.md](../qa/2026-04-14-win11-smoke-test-checklist.md)。
