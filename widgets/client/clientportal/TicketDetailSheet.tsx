import * as React from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  CLIENT_PORTAL_TICKET_DETAIL_QUERY,
  CLIENT_PORTAL_TICKET_STAGE_META_QUERY,
  CLIENT_PORTAL_TICKET_STAGES_QUERY,
  CLIENT_PORTAL_TICKET_CONTACTS_QUERY,
  CLIENT_PORTAL_TICKET_COMMENTS_QUERY,
  CLIENT_PORTAL_COMMENTS_ADD_MUTATION,
  CLIENT_PORTAL_ASSIGNABLE_MEMBERS_QUERY,
  CLIENT_PORTAL_TICKET_ASSIGN_MUTATION,
  CpTicketDetail,
  CpTicketStage,
  CpTicketComment,
  CpAssignableMember,
} from './graphql'

interface Props {
  client: ApolloClient<NormalizedCacheObject>
  ticketId: string | null
  onClose: () => void
  isStaff: boolean
}

const STAGE_COLORS: Record<string, string> = {
  '10%': '#60a5fa',
  '20%': '#818cf8',
  '30%': '#a78bfa',
  '40%': '#c084fc',
  '50%': '#e879f9',
  '60%': '#f97316',
  '70%': '#fb923c',
  '80%': '#fbbf24',
  '90%': '#10b981',
  Won: '#10b981',
  Done: '#06b6d4',
  Lost: '#ef4444',
}
const DEFAULT_STAGE_COLOR = '#94a3b8'

function getStageColor(probability?: string | null): string {
  if (!probability) return DEFAULT_STAGE_COLOR
  return STAGE_COLORS[probability] ?? DEFAULT_STAGE_COLOR
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .trim()
}

function formatDateTimeToMinute(value: unknown): string {
  if (value == null) return '-'
  const source = typeof value === 'string' || typeof value === 'number' ? value : String(value)
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return String(source)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function memberName(m: CpAssignableMember): string {
  return [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || m._id
}

export function TicketDetailSheet({ client, ticketId, onClose, isStaff }: Props) {
  const [detail, setDetail] = React.useState<CpTicketDetail | null>(null)
  const [pipelineStages, setPipelineStages] = React.useState<CpTicketStage[]>([])
  const [contacts, setContacts] = React.useState<{
    customers: Array<{
      _id: string
      firstName?: string
      lastName?: string
      primaryEmail?: string
      primaryPhone?: string
    }>
    companies: Array<{ _id: string; primaryName?: string; primaryEmail?: string; primaryPhone?: string }>
  }>({ customers: [], companies: [] })
  const [comments, setComments] = React.useState<CpTicketComment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [commentsLoading, setCommentsLoading] = React.useState(false)
  const [replyText, setReplyText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [members, setMembers] = React.useState<CpAssignableMember[]>([])
  const [assignedIds, setAssignedIds] = React.useState<string[]>([])
  const [showAssignPicker, setShowAssignPicker] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const fetchComments = React.useCallback(
    async (id: string) => {
      setCommentsLoading(true)
      try {
        const { data } = await client.query({
          query: CLIENT_PORTAL_TICKET_COMMENTS_QUERY,
          variables: { typeId: id, type: 'ticket' },
          fetchPolicy: 'network-only',
        })
        setComments(data?.clientPortalComments ?? [])
      } catch {
        setComments([])
      } finally {
        setCommentsLoading(false)
      }
    },
    [client]
  )

  const fetchDetail = React.useCallback(
    async (id: string) => {
      setLoading(true)
      setDetail(null)
      setPipelineStages([])
      setContacts({ customers: [], companies: [] })
      try {
        const [detailRes, contactsRes] = await Promise.all([
          client.query({
            query: CLIENT_PORTAL_TICKET_DETAIL_QUERY,
            variables: { _id: id },
            fetchPolicy: 'network-only',
          }),
          client
            .query({
              query: CLIENT_PORTAL_TICKET_CONTACTS_QUERY,
              variables: { ticketId: id },
              fetchPolicy: 'network-only',
            })
            .catch(() => ({ data: null })),
        ])
        const ticket = detailRes.data?.clientPortalTicket ?? null
        setDetail(ticket)
        setAssignedIds(ticket?.assignedUserIds ?? [])
        if (contactsRes.data?.clientPortalTicketContacts) {
          setContacts(contactsRes.data.clientPortalTicketContacts)
        }
        const stageMetaRes = await client
          .query({
            query: CLIENT_PORTAL_TICKET_STAGE_META_QUERY,
            variables: { ticketId: id },
            fetchPolicy: 'network-only',
          })
          .catch(() => ({ data: null }))
        const pipelineId = stageMetaRes.data?.clientPortalTicketStageMeta?.pipelineId
        if (pipelineId) {
          const stagesRes = await client.query({
            query: CLIENT_PORTAL_TICKET_STAGES_QUERY,
            variables: { pipelineId },
            fetchPolicy: 'network-only',
          })
          setPipelineStages(stagesRes.data?.clientPortalGetTicketStages ?? [])
        }
      } finally {
        setLoading(false)
      }
    },
    [client]
  )

  const fetchMembers = React.useCallback(async () => {
    try {
      const { data } = await client.query({
        query: CLIENT_PORTAL_ASSIGNABLE_MEMBERS_QUERY,
        fetchPolicy: 'network-only',
      })
      setMembers(data?.clientPortalAssignableMembers ?? [])
    } catch {
      setMembers([])
    }
  }, [client])

  React.useEffect(() => {
    if (!ticketId) {
      setDetail(null)
      setPipelineStages([])
      setContacts({ customers: [], companies: [] })
      setComments([])
      setReplyText('')
      setAssignedIds([])
      setShowAssignPicker(false)
      return
    }
    fetchDetail(ticketId)
    fetchComments(ticketId)
    fetchMembers().catch(() => {})
  }, [ticketId, fetchDetail, fetchComments, fetchMembers])

  const toggleAssign = React.useCallback((memberId: string) => {
    setAssignedIds((prev) =>
      prev.includes(memberId) ? prev.filter((i) => i !== memberId) : [...prev, memberId]
    )
  }, [])

  const saveAssignees = React.useCallback(async () => {
    if (!ticketId) return
    setAssigning(true)
    try {
      await client.mutate({
        mutation: CLIENT_PORTAL_TICKET_ASSIGN_MUTATION,
        variables: { ticketId, assignedUserIds: assignedIds },
      })
      setShowAssignPicker(false)
      await fetchDetail(ticketId)
    } finally {
      setAssigning(false)
    }
  }, [ticketId, assignedIds, client, fetchDetail])

  const sendReply = React.useCallback(async () => {
    if (!ticketId || !replyText.trim()) return
    setSending(true)
    try {
      const { data } = await client.mutate({
        mutation: CLIENT_PORTAL_COMMENTS_ADD_MUTATION,
        variables: {
          type: 'ticket',
          typeId: ticketId,
          content: replyText.trim(),
          userType: isStaff ? 'team' : 'client',
        },
      })
      if (data?.clientPortalCommentsAdd) {
        setComments((prev) => [...prev, data.clientPortalCommentsAdd])
        setReplyText('')
        window.setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }, 80)
      }
    } finally {
      setSending(false)
    }
  }, [ticketId, replyText, isStaff, client])

  const stageColorMap = React.useMemo(() => {
    const entries = pipelineStages.map((stage) => [stage._id, getStageColor(stage.probability)] as const)
    const nextMap = new Map(entries)
    if (!isStaff && pipelineStages.length >= 4) {
      const thirdId = pipelineStages[2]._id
      const fourthId = pipelineStages[3]._id
      const thirdColor = nextMap.get(thirdId)
      const fourthColor = nextMap.get(fourthId)
      if (thirdColor && fourthColor) {
        nextMap.set(thirdId, fourthColor)
        nextMap.set(fourthId, thirdColor)
      }
    }
    return nextMap
  }, [pipelineStages, isStaff])

  const currentStage =
    detail?.stageId != null
      ? pipelineStages.find((s) => s._id === detail.stageId) ?? null
      : null
  const currentStageName = currentStage?.name ?? ''
  const currentStageColor = currentStage
    ? stageColorMap.get(currentStage._id) ?? getStageColor(currentStage.probability)
    : getStageColor(undefined)

  const customers = contacts.customers ?? []
  const companies = contacts.companies ?? []
  const customerLine = customers
    .map((c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.primaryEmail || '')
    .filter(Boolean)
    .join(', ')
  const companyLine = companies.map((co) => co.primaryName || '').filter(Boolean).join(', ')

  if (!ticketId) return null

  return (
    <>
      {showAssignPicker && isStaff && (
        <div style={assignOverlay} role="presentation" onClick={() => setShowAssignPicker(false)}>
          <div style={assignSheet} role="dialog" onClick={(e) => e.stopPropagation()}>
            <div style={assignHeader}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>담당자 지정</span>
              <button
                type="button"
                disabled={assigning}
                style={assignSaveBtn}
                onClick={() => saveAssignees().catch(() => {})}
              >
                {assigning ? '…' : '저장'}
              </button>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {members.map((m) => {
                const selected = assignedIds.includes(m._id)
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => toggleAssign(m._id)}
                    style={{
                      ...assignRow,
                      background: selected ? '#e8f1ff' : '#fff',
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{selected ? '☑' : '☐'}</span>
                    {memberName(m)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div style={overlay} role="presentation" onClick={onClose}>
        <div style={sheet} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
          <div style={sheetHeader}>
            <button type="button" style={closeBtn} onClick={onClose}>
              닫기
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: 24, color: '#666' }}>불러오는 중…</p>
          ) : !detail ? (
            <p style={{ textAlign: 'center', padding: 24, color: '#c00' }}>
              티켓 정보를 불러오지 못했습니다.
            </p>
          ) : (
            <>
              <div ref={scrollRef} style={scrollArea}>
                <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{detail.name}</h2>
                {(customerLine || companyLine) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {!!customerLine && <span style={badgeLight}>{customerLine}</span>}
                    {!!companyLine && <span style={badgeDark}>{companyLine}</span>}
                  </div>
                )}
                {!!currentStageName && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: `1px solid ${currentStageColor}`,
                      background: `${currentStageColor}22`,
                      color: currentStageColor,
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    {currentStageName}
                  </div>
                )}

                <div style={{ marginBottom: 12, fontSize: 13 }}>
                  <strong>담당자</strong>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {assignedIds.length === 0 ? (
                      <span style={{ color: '#888' }}>없음</span>
                    ) : (
                      assignedIds.map((id) => {
                        const m = members.find((mb) => mb._id === id)
                        const name = m ? memberName(m) : id
                        return (
                          <span key={id} style={chip}>
                            {name}
                          </span>
                        )
                      })
                    )}
                    {isStaff && (
                      <button type="button" style={editAssignBtn} onClick={() => setShowAssignPicker(true)}>
                        변경
                      </button>
                    )}
                  </div>
                </div>

                {!!detail.description && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      lineHeight: 1.5,
                      marginBottom: 14,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {stripHtml(detail.description)}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #e8ecf2', paddingTop: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    댓글 {comments.length > 0 ? `${comments.length}개` : ''}
                  </span>
                </div>

                {commentsLoading ? (
                  <p style={{ fontSize: 12, color: '#888' }}>댓글 로딩…</p>
                ) : comments.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#888' }}>아직 댓글이 없습니다.</p>
                ) : (
                  comments.map((c) => {
                    const isTeam = c.userType === 'team'
                    const isRight = isStaff ? isTeam : !isTeam
                    return (
                      <div
                        key={c._id}
                        style={{
                          display: 'flex',
                          justifyContent: isRight ? 'flex-end' : 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ maxWidth: '88%' }}>
                          <div
                            style={{
                              background: isRight ? '#1f3f73' : '#e8f0fd',
                              color: isRight ? '#fff' : '#1a1a1a',
                              padding: '8px 10px',
                              borderRadius: 8,
                              fontSize: 13,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {c.content}
                          </div>
                          <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, display: 'block' }}>
                            {formatDateTimeToMinute(c.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div style={{ height: 8 }} />
              </div>

              <div style={replyRow}>
                <textarea
                  style={replyInput}
                  placeholder="답글 입력…"
                  value={replyText}
                  maxLength={2000}
                  rows={2}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="button"
                  style={{
                    ...sendBtn,
                    opacity: replyText.trim() && !sending ? 1 : 0.5,
                  }}
                  disabled={!replyText.trim() || sending}
                  onClick={() => sendReply().catch(() => {})}
                >
                  {sending ? '…' : '전송'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
}

const sheet: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  maxHeight: '92vh',
  background: '#fff',
  borderTopLeftRadius: 14,
  borderTopRightRadius: 14,
  boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const sheetHeader: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '8px 12px 4px',
  borderBottom: '1px solid #eef2f6',
  flexShrink: 0,
}

const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#4a90d9',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  padding: '4px 8px',
}

const scrollArea: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 14px 8px',
  minHeight: 120,
}

const replyRow: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: 10,
  borderTop: '1px solid #e8ecf2',
  alignItems: 'flex-end',
  flexShrink: 0,
  background: '#fafbfc',
}

const replyInput: React.CSSProperties = {
  flex: 1,
  border: '1px solid #d0d8e4',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 13,
  resize: 'none',
  fontFamily: 'inherit',
}

const sendBtn: React.CSSProperties = {
  background: '#4a90d9',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  flexShrink: 0,
}

const badgeLight: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: '#e8f4fc',
  color: '#1a4db3',
}

const badgeDark: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: '#334155',
  color: '#fff',
}

const chip: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: '#f1f5f9',
  color: '#475569',
}

const editAssignBtn: React.CSSProperties = {
  fontSize: 11,
  padding: '4px 10px',
  borderRadius: 8,
  border: '1px solid #4a90d9',
  background: '#fff',
  color: '#4a90d9',
  cursor: 'pointer',
}

const assignOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10001,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const assignSheet: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 360,
  maxHeight: '80vh',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
}

const assignHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 14px',
  borderBottom: '1px solid #eee',
}

const assignSaveBtn: React.CSSProperties = {
  background: '#4a90d9',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const assignRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  borderBottom: '1px solid #f0f0f0',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 14,
}
