import { renderHook, act } from '@testing-library/react'
import { useAttendanceRecord, saveAttendanceRecord, AttendanceRecord } from '../hooks/useAttendanceRecord'

const mockRecord: AttendanceRecord = {
  startHour: 9,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  deeplinkUrl: 'app://attendance',
  deeplinkParams: {},
}

function todayKey() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `attendance_${yyyy}-${mm}-${dd}`
}

describe('useAttendanceRecord', () => {
  beforeEach(() => localStorage.clear())

  it('오늘 기록 없으면 null 반환', () => {
    const { result } = renderHook(() => useAttendanceRecord())
    expect(result.current.record).toBeNull()
  })

  it('saveAttendanceRecord 후 기록 반환', async () => {
    await act(async () => {
      await saveAttendanceRecord(mockRecord)
    })
    const { result } = renderHook(() => useAttendanceRecord())
    expect(result.current.record).toEqual(mockRecord)
  })

  it('localStorage 값이 깨진 경우 null 반환', () => {
    localStorage.setItem(todayKey(), 'not-json')
    const { result } = renderHook(() => useAttendanceRecord())
    expect(result.current.record).toBeNull()
  })
})
