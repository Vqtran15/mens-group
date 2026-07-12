type Gtag = (...args: unknown[]) => void

function gtag(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as typeof window & { gtag?: Gtag }
  if (typeof w.gtag === 'function') w.gtag('event', name, params)
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  gtag(name, params)
}
