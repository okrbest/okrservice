/** 알림 link 예: ticket/board?...&itemId=xxx , /tickets?itemId=xxx */
export function extractTicketIdFromLink(link?: string | null): string | null {
  if (!link) return null
  const m = link.match(/(?:^|[?&])itemId=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export function getTicketIdFromNotification(item: {
  link?: string | null
  eventData?: { ticketId?: string } | null
}): string | null {
  const fromLink = extractTicketIdFromLink(item.link)
  if (fromLink) return fromLink
  const tid = item.eventData?.ticketId
  return typeof tid === 'string' && tid.length > 0 ? tid : null
}

export function openExternalNotificationLink(link: string): void {
  const u = link.trim()
  if (!u) return
  if (/^https?:\/\//i.test(u)) {
    window.open(u, '_blank', 'noopener,noreferrer')
    return
  }
  const origin =
    typeof window !== 'undefined'
      ? String((window as any).erxesSettings?.clientportal?.exmOrigin || '').replace(/\/$/, '')
      : ''
  if (origin && u.startsWith('/')) {
    window.open(`${origin}${u}`, '_blank', 'noopener,noreferrer')
  }
}
