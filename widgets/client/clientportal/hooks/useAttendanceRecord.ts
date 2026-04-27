import { useState } from 'react'

export interface AttendanceRecord {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  deeplinkUrl: string
  deeplinkParams: Record<string, string>
}

function todayKey(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `attendance_${yyyy}-${mm}-${dd}`
}

function readFromStorage(): AttendanceRecord | null {
  try {
    const raw = localStorage.getItem(todayKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.startHour === 'number' &&
      typeof parsed?.deeplinkUrl === 'string'
    ) {
      return parsed as AttendanceRecord
    }
    return null
  } catch {
    return null
  }
}

export function saveAttendanceRecord(data: AttendanceRecord): void {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(data))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useAttendanceRecord() {
  const [record, setRecord] = useState<AttendanceRecord | null>(() => readFromStorage())

  return { record, setRecord }
}
