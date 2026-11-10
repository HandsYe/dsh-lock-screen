// dsh-lock-screen — client side.
//
// Two pieces:
//   • A lock button in the sidebar footer (slot sidebar.footer.action).
//   • A frame-wide lock overlay (slot shell.overlay): covers every column with
//     the current desktop wallpaper; nothing else is visible or clickable.
//     Press Esc twice (within 2s) to unlock.
//
// Client entries must be classic scripts registered via window.__ModuleLoader__.load
window.__ModuleLoader__.load({
  id: 'dsh-lock-screen',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const name = 'dsh-lock-screen'

    // ── shared lock state (module-level, shared by button + overlay) ──
    const LOCK = { locked: false, wallpaper: '', error: '', escHint: false }
    const LISTENERS = new Set()
    const notify = () => { for (const fn of LISTENERS) try { fn() } catch (e) { /* ignore */ } }

    function apiPath(path) {
      return window.location && window.location.protocol === 'dsh-app:'
        ? '/api' + path : path
    }

    async function fetchWallpaper() {
      try {
        const res = await fetch(apiPath('/dsh-lock-screen/wallpaper'), { cache: 'no-store' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data && (data.error || data.message)) || 'HTTP ' + res.status)
        }
        const blob = await res.blob()
        if (LOCK.wallpaper) URL.revokeObjectURL(LOCK.wallpaper)
        LOCK.wallpaper = URL.createObjectURL(blob)
        LOCK.error = ''
      } catch (e) {
        LOCK.wallpaper = ''
        LOCK.error = String((e && e.message) || e)
      }
      notify()
    }

    function lock() {
      LOCK.locked = true
      LOCK.wallpaper = ''
      LOCK.error = ''
      fetchWallpaper()
      notify()
    }

    function unlock() {
      LOCK.locked = false
      LOCK.escHint = false
      notify()
    }

    const HINT_BASE = '按 Esc 两次退出锁屏'
    const HINT_ARMED = '再按一次 Esc 退出锁屏'

    // ── 锁定覆盖层：全屏壁纸，其余内容不可见、不可点 ────────────────
    function LockOverlay() {
      const [, setTick] = React.useState(0)
      React.useEffect(() => {
        const bump = () => setTick((x) => x + 1)
        LISTENERS.add(bump)
        return () => LISTENERS.delete(bump)
      }, [])

      const locked = LOCK.locked
      React.useEffect(() => {
        if (!locked) return
        let escCount = 0
        let lastEscAt = 0
        const onKey = (e) => {
          // 吞掉所有按键，锁定期间不穿透到底层 UI
          if (e.type === 'keydown') e.preventDefault()
          e.stopPropagation()
          if (e.type !== 'keydown' || e.key !== 'Escape' || e.repeat) return
          const now = Date.now()
          if (now - lastEscAt > 2000) escCount = 0
          lastEscAt = now
          escCount += 1
          if (escCount >= 2) { unlock(); return }
          LOCK.escHint = true
          notify()
        }
        window.addEventListener('keydown', onKey, true)
        window.addEventListener('keyup', onKey, true)
        return () => {
          window.removeEventListener('keydown', onKey, true)
          window.removeEventListener('keyup', onKey, true)
        }
      }, [locked])

      if (!locked) return null
      const swallow = (e) => { e.preventDefault(); e.stopPropagation() }
      const hint = LOCK.escHint ? HINT_ARMED : HINT_BASE
      return React.createElement('div', {
        role: 'presentation',
        onMouseDown: swallow,
        onContextMenu: swallow,
        onWheel: swallow,
        onTouchStart: swallow,
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 2147483000,
          backgroundColor: '#000',
          backgroundImage: LOCK.wallpaper ? 'url("' + LOCK.wallpaper + '")' : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        },
      },
        React.createElement('div', {
          style: {
            padding: '0 16px 44px',
            color: 'rgba(255,255,255,.78)',
            fontSize: 13,
            letterSpacing: 1,
            textShadow: '0 1px 4px rgba(0,0,0,.85)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          },
        },
          LOCK.error ? '壁纸读取失败（' + LOCK.error + '）· ' : '',
          hint))
    }

    // ── 侧边栏底部锁屏按钮 ──────────────────────────────────────────
    function lockIcon() {
      return React.createElement('svg', {
        viewBox: '0 0 24 24', width: 16, height: 16,
        fill: 'none', stroke: 'currentColor', strokeWidth: 2,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
        React.createElement('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
        React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }))
    }

    function LockButton(props) {
      const wide = props && props.wide
      return React.createElement('button', {
        type: 'button',
        title: '锁屏（按 Esc 两次退出）',
        'aria-label': '锁屏（按 Esc 两次退出）',
        onClick: lock,
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: wide ? '100%' : 28,
          height: 28,
          padding: 0,
          borderRadius: wide ? 8 : 14,
          border: '1px solid rgba(127,127,127,.25)',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.75,
        },
      }, lockIcon())
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      // 侧边栏底部入口
      slots.inject('sidebar.footer.action', () =>
        slots.register({ name: 'sidebar.footer.action', id: 'dsh-lock-screen', priority: 30 }, LockButton),
      )
      // 全屏锁定层
      slots.inject('shell.overlay', () =>
        slots.register({ name: 'shell.overlay', id: 'dsh-lock-screen', order: 1000, label: 'lock-screen' }, LockOverlay),
      )
    }

    exports.name = name
    exports.inject = ['slots']
    exports.apply = apply
    return module.exports
  },
})
