// dsh-lock-screen — host side.
//
// Serves the current desktop wallpaper to the client lock overlay:
//   GET /dsh-lock-screen/wallpaper   → image bytes (jpeg/png/bmp/gif/webp)
//
// Resolution order (Windows):
//   1. %APPDATA%\Microsoft\Windows\Themes\TranscodedWallpaper
//   2. Newest image in %APPDATA%\Microsoft\Windows\Themes\CachedFiles\
//   3. Registry HKCU\Control Panel\Desktop value "WallPaper"
//
// No tools are registered on purpose: the lock screen is a pure UI feature
// and must never touch the agent loop.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { registerHttpTransports } from './http-transport.js'

export const name = 'dsh-lock-screen'
export const inject = []

const MAX_WALLPAPER_BYTES = 64 * 1024 * 1024

function themesDir() {
  const appData = process.env.APPDATA
  if (appData && String(appData).trim()) {
    return path.join(String(appData).trim(), 'Microsoft', 'Windows', 'Themes')
  }
  return path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Themes')
}

function wallpaperCandidates() {
  const list = []
  const themes = themesDir()
  list.push(path.join(themes, 'TranscodedWallpaper'))
  try {
    const cached = path.join(themes, 'CachedFiles')
    if (existsSync(cached)) {
      const newest = readdirSync(cached)
        .filter((f) => /\.(jpe?g|png|bmp|gif)$/i.test(f))
        .map((f) => ({ f, m: statSync(path.join(cached, f), { throwIfNoEntry: false })?.mtimeMs || 0 }))
        .sort((a, b) => b.m - a.m)
        .map((x) => path.join(cached, x.f))
      list.push(...newest)
    }
  } catch { /* ignore cache scan failures */ }
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Control Panel\\Desktop', '/v', 'WallPaper'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
    })
    const m = out.match(/WallPaper\s+REG_SZ\s+(.+)/i)
    if (m) {
      const p = m[1].trim()
      if (p) list.push(p)
    }
  } catch { /* ignore registry failures */ }
  return list
}

function sniffMime(buf) {
  if (!buf || buf.length < 12) return 'application/octet-stream'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return 'application/octet-stream'
}

function findWallpaper() {
  for (const file of wallpaperCandidates()) {
    try {
      const st = statSync(file, { throwIfNoEntry: false })
      if (!st || !st.isFile() || st.size === 0 || st.size > MAX_WALLPAPER_BYTES) continue
      return file
    } catch { /* try next candidate */ }
  }
  return null
}

const sendJson = (res, code, obj) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

const exact = (path_, handler) => ({ kind: 'exact', path: path_, handler })

const routes = [
  exact('/dsh-lock-screen/wallpaper', async (req, res) => {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
    try {
      const file = findWallpaper()
      if (!file) return sendJson(res, 404, { error: 'no desktop wallpaper found' })
      const buf = readFileSync(file)
      res.statusCode = 200
      res.setHeader('Content-Type', sniffMime(buf))
      res.setHeader('Cache-Control', 'no-store')
      res.end(buf)
    } catch (error) {
      sendJson(res, 500, { error: String((error && error.message) || error) })
    }
  }),
  exact('/dsh-lock-screen/ping', async (req, res) => {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
    const file = findWallpaper()
    sendJson(res, 200, { ok: true, wallpaper: file || '', found: Boolean(file) })
  }),
]

export function apply(ctx) {
  registerHttpTransports(ctx, routes)
}
