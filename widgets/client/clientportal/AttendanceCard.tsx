import * as React from 'react'
import { AttendanceRecord } from './hooks/useAttendanceRecord'

interface Props {
  record: AttendanceRecord
}

function formatWorkTime(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): string {
  const start = startMinute > 0 ? `${startHour}시 ${startMinute}분` : `${startHour}시`
  const end = endMinute > 0 ? `${endHour}시 ${endMinute}분` : `${endHour}시`
  return `오늘 근무시간은 ${start}부터 ${end} 입니다.`
}

function openDeeplinkViaWebView(url: string, params: Record<string, string>): void {
  const rnWebView = (window as any).ReactNativeWebView
  if (rnWebView?.postMessage) {
    rnWebView.postMessage(JSON.stringify({ type: 'deeplink', url, params }))
  }
}

export function AttendanceCard({ record }: Props) {
  const handleClick = () => {
    openDeeplinkViaWebView(record.deeplinkUrl, record.deeplinkParams)
  }

  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={bubbleStyle}>
        <span style={labelStyle}>📋 근무 안내</span>
        <span style={textStyle}>
          {formatWorkTime(record.startHour, record.startMinute, record.endHour, record.endMinute)}
        </span>
      </div>
      <div style={bubbleStyle}>
        <span style={textStyle}>출근 10분 전입니다. 출근 확인 하시겠습니까?</span>
      </div>
      <button style={ctaStyle} onClick={handleClick}>
        출근 확인하기
      </button>
    </div>
  )
}

const bubbleStyle: React.CSSProperties = {
  background: '#e8f0fd',
  border: '1px solid #b8cef5',
  borderRadius: 8,
  padding: '8px 10px',
  alignSelf: 'flex-start',
  maxWidth: '85%',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#4a90d9',
  fontWeight: 700,
}

const textStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#1f3f73',
  fontWeight: 600,
  lineHeight: '16px',
}

const ctaStyle: React.CSSProperties = {
  background: '#eaf2ff',
  border: '1.5px solid #4a90d9',
  borderRadius: 8,
  padding: '8px 16px',
  alignSelf: 'flex-start',
  color: '#4a90d9',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
