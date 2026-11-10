# dsh-lock-screen

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

One-click lock screen for the DeepSeek Harness web GUI. A lock button in the
left sidebar footer hides the entire interface behind your current Windows
desktop wallpaper; press **Esc twice** to unlock.

DeepSeek Harness 网页端一键锁屏插件。左侧栏底部的锁形按钮会把整个界面隐藏在当前
Windows 桌面壁纸后面；连按 **两次 Esc** 解锁。

![dsh-lock-screen icon](assets/icon.png)

## Install

**From the plugin market (dsh 0.2.1+):** open **Plugins → Discover** and search
for `dsh-lock-screen`. The listing is served from the curated
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
registry; before it is merged you can still install from source as below.

**从插件市场安装（dsh 0.2.1+）：** 打开 **插件 → 发现**，搜索 `dsh-lock-screen`。
列表来自 awesome-dsh-plugin 精选目录；合并前也可按下方方式从源码安装。

**From source** (requires `dsh web` / DSH Desktop) / **从源码安装**（需要
`dsh web` / DSH Desktop）:

```sh
dsh plugin --profile desktop add github:HandsYe/dsh-lock-screen
```

Replace `desktop` with your profile's actual name. On the official DSH Desktop,
install through **Settings → Plugins** instead — the Desktop manages its own
profile.

将 `desktop` 替换为你实际使用的 profile 名称。官方 DSH Desktop 请通过
**设置 → 插件** 安装 —— Desktop 自行管理 profile。

**From a release tarball** (no build step, pinned to this version) /
**从 Release 安装包安装**（无需构建，锁定当前版本）:

```sh
dsh plugin --profile desktop add https://github.com/HandsYe/dsh-lock-screen/releases/download/v0.1.0/dsh-lock-screen.tgz
```

The `tarball:` field in the catalog entry points at
`releases/latest/download/dsh-lock-screen.tgz`, which always tracks the newest
release.

Most installs go live without a restart; if the button does not appear, refresh
the page once.

多数安装无需重启即可生效；如果按钮没有出现，刷新一次页面即可。

## Usage

- A lock button (🔒) appears in the left sidebar footer, next to Settings.
- Click it to lock: the whole frame is covered by a full-screen layer showing
  the current Windows desktop wallpaper (`background-size: cover`). Nothing
  else is visible or clickable; key presses, wheel, and context menu are all
  swallowed.
- Press **Esc twice within 2 seconds** to unlock. After the first Esc a hint
  「再按一次 Esc 退出锁屏」appears at the bottom; the counter resets after the
  window elapses, and held-down key autorepeat is ignored, so an accidental
  single press cannot unlock the screen.

## 使用方法

- 左侧栏底部（“设置”旁）会出现一个锁形按钮（🔒）。
- 点击即锁屏：整个界面被一层全屏壁纸覆盖（`background-size: cover`），其余内容
  不可见、不可点击；按键、滚轮、右键菜单全部被拦截。
- **2 秒内连按两次 Esc** 解锁。第一次按下后底部提示「再按一次 Esc 退出锁屏」；
  超时后计数重置，按住不放的自动重复不计数，因此误触一次不会解锁。

## How it works

- Client side (`lib/client.js`): a classic client module registered via
  `window.__ModuleLoader__.load`. It renders into two slots:
  - `sidebar.footer.action` — the lock button.
  - `shell.overlay` — the frame-wide lock layer (topmost z-index, above every
    column and panel).
- Host side (`lib/index.js`): serves `GET /dsh-lock-screen/wallpaper`, the
  current desktop wallpaper bytes, with MIME sniffed from magic bytes
  (jpeg/png/bmp/gif/webp). Resolution order on Windows:
  1. `%APPDATA%\Microsoft\Windows\Themes\TranscodedWallpaper`
  2. Newest image in `%APPDATA%\Microsoft\Windows\Themes\CachedFiles\`
  3. Registry `HKCU\Control Panel\Desktop` value `WallPaper`

  `GET /dsh-lock-screen/ping` returns which file was picked, for debugging.
- HTTP routes are registered on both the legacy web server and the Connection
  `/api` channel (`lib/http-transport.js`), so the desktop (`dsh-app:`)
  protocol and plain browser access both work.

If the wallpaper cannot be found (e.g. a solid-color wallpaper with no image
file), the lock layer falls back to a black background and shows the read error
in the hint line.

## 工作原理

- 客户端（`lib/client.js`）：经 `window.__ModuleLoader__.load` 注册的经典客户端
  模块，渲染到两个槽位：
  - `sidebar.footer.action` —— 锁屏按钮。
  - `shell.overlay` —— 全框架锁屏层（最高 z-index，位于所有列与面板之上）。
- 宿主端（`lib/index.js`）：提供 `GET /dsh-lock-screen/wallpaper` 路由，返回
  当前桌面壁纸字节，MIME 由文件魔数嗅探（jpeg/png/bmp/gif/webp）。Windows 下的
  解析顺序：
  1. `%APPDATA%\Microsoft\Windows\Themes\TranscodedWallpaper`
  2. `%APPDATA%\Microsoft\Windows\Themes\CachedFiles\` 中最新的图片
  3. 注册表 `HKCU\Control Panel\Desktop` 的 `WallPaper` 值

  `GET /dsh-lock-screen/ping` 返回实际选中的文件路径，用于调试。
- HTTP 路由同时注册到旧版 web 服务器与 Connection `/api` 通道
  （`lib/http-transport.js`），桌面端（`dsh-app:` 协议）与普通浏览器访问均可
  正常工作。

找不到壁纸时（如纯色壁纸、无图片文件），锁屏层回退为黑色背景，并在提示行显示
读取错误。

## No tools

The plugin registers no agent tools — it is a pure UI feature and never touches
the agent loop. The host side makes no network requests; wallpaper bytes are
read from local Windows paths only.

## 无工具

本插件不注册任何 agent 工具 —— 纯界面功能，绝不触碰 agent 循环。宿主端不发起
任何网络请求；壁纸字节仅从本地 Windows 路径读取。

## Compatibility

Requires `dsh web` 0.1.0-rc.6 or newer (the `shell.overlay` and
`sidebar.footer.action` slots). Official `@deepseek-ai/*` packages are declared
as optional `peerDependencies`, so installs do not fail on hosts whose renderer
or web server versions differ. Windows wallpaper resolution is Windows-only;
on other platforms the overlay falls back to black unless a wallpaper image is
found in one of the probed paths.

## 兼容性

需要 `dsh web` 0.1.0-rc.6 或更新版本（`shell.overlay` 与 `sidebar.footer.action`
槽位）。官方 `@deepseek-ai/*` 包均声明为可选 `peerDependencies`，因此渲染器或
web 服务器版本不同也不会导致安装失败。壁纸解析仅限 Windows；其他平台在探测
路径中找不到壁纸图片时回退为黑色。

## License

MIT — see [LICENSE](LICENSE).

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
