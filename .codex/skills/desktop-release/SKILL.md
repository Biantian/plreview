---
name: desktop-release
description: Use when packaging, verifying, or releasing desktop application artifacts, especially when macOS signing, notarization, DMG delivery, or Gatekeeper failures are involved.
---

# Desktop Release

Use this repo's scripted release flow instead of ad-hoc Finder sharing.

## When to Use

- Building a shareable desktop artifact
- Preparing a macOS DMG for other machines
- Verifying a signed/notarized mac app
- Investigating "app is damaged" or Gatekeeper launch failures

## Commands

Local packaging:

```bash
npm run desktop:dist -- --mac dmg --arm64
```

Formal mac release:

```bash
npm run desktop:release:mac
```

Release verification only:

```bash
npm run desktop:verify:mac-release
```

Friend-trial workaround after chat or browser delivery:

```bash
xattr -dr com.apple.quarantine /Applications/PLReview.app
```

## Required mac Release Inputs

Provide one notarization credential strategy:

- `APPLE_KEYCHAIN_PROFILE`
- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`

For signing, make sure a `Developer ID Application` certificate is available in the keychain or via the `CSC_LINK` / `CSC_KEY_PASSWORD` flow used by `electron-builder`.

## Expected Verification

Successful formal releases should pass:

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/PLReview.app
spctl -a -vv release/mac-arm64/PLReview.app
xcrun stapler validate release/PLReview-0.1.0-arm64.dmg
```

If a DMG sent through chat tools shows "已损坏", first confirm the artifact was signed, notarized, and stapled before blaming the transport path.
If the app is only being shared with a few trusted testers, document the quarantine-removal workaround and avoid presenting that build as a formal release.
