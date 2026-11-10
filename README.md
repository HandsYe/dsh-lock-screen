# dsh-lock-screen

One-click lock screen for the DeepSeek Harness web GUI.

- A lock button (🔒 icon) appears in the left sidebar footer, next to Settings.
- Click it to lock: the whole frame is covered by a full-screen layer showing
  the current Windows desktop wallpaper (`background-size: cover`). Nothing
  else is visible or clickable, and all keyboard input is swallowed.
- Press **Esc twice** (within 2 seconds) to unlock. After the first Esc a hint
  「再按一次 Esc 退出锁屏」shows at the bottom of the screen.

## How it works

- Client side (`lib/client.js`): a classic client module registered via
  `window.__ModuleLoader__.load`. It renders into two slots:
  - `sidebar.footer.action` — the lock button.
  - `shell.overlay` — the frame-wide lock layer.
- Host side (`lib/index.js`): serves `GET /dsh-lock-screen/wallpaper`, the
  current desktop wallpaper bytes (sniffed mime: jpeg/png/bmp/gif/webp).
  Resolution order on Windows:
  1. `%APPDATA%\Microsoft\Windows\Themes\TranscodedWallpaper`
  2. Newest image in `%APPDATA%\Microsoft\Windows\Themes\CachedFiles\`
  3. Registry `HKCU\Control Panel\Desktop` value `WallPaper`

  `GET /dsh-lock-screen/ping` returns which file was picked, for debugging.
- HTTP routes are registered on both the legacy web server and the Connection
  `/api` channel (`lib/http-transport.js`), so the desktop (`dsh-app:`)
  protocol and plain browser access both work.

If the wallpaper cannot be found (e.g. solid-color wallpaper), the lock layer
falls back to a black background and shows the read error in the hint line.

## No tools

The plugin registers no agent tools — it is a pure UI feature and never
touches the agent loop.
