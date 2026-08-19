// Real theme application — genuinely toggles the .dark class on the
// document root, which the real CSS variables in index.css respond to
// across the whole app. "System" genuinely checks the real device
// preference and stays in sync if that changes while the app is open,
// not just read once.
export function applyTheme(preference) {
  const root = document.documentElement
  const resolved =
    preference === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference

  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function watchSystemTheme(preference, callback) {
  if (preference !== 'system') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => callback()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
