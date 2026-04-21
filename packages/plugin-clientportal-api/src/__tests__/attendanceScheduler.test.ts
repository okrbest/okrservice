import { isAttendanceWindowNow, todayKST } from '../jobs/attendanceScheduler'

describe('isAttendanceWindowNow', () => {
  it('출근 10분 전이면 true 반환', () => {
    expect(isAttendanceWindowNow(9, 0, 8, 50)).toBe(true)
  })

  it('출근 정각이면 false 반환', () => {
    expect(isAttendanceWindowNow(9, 0, 9, 0)).toBe(false)
  })

  it('출근 11분 전이면 false 반환', () => {
    expect(isAttendanceWindowNow(9, 0, 8, 49)).toBe(false)
  })

  it('출근 9분 전이면 false 반환', () => {
    expect(isAttendanceWindowNow(9, 0, 8, 51)).toBe(false)
  })

  it('분 경계: 9:10 출근의 경우 9:00에 true', () => {
    expect(isAttendanceWindowNow(9, 10, 9, 0)).toBe(true)
  })

  it('자정 경계: 0:10 출근의 경우 0:00에 true', () => {
    expect(isAttendanceWindowNow(0, 10, 0, 0)).toBe(true)
  })
})

describe('todayKST', () => {
  it('YYYY-MM-DD 형식 반환', () => {
    expect(todayKST()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
