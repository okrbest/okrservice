import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { AttendanceCard } from '../AttendanceCard'

const baseRecord = {
  startHour: 9,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  deeplinkUrl: 'app://attendance',
  deeplinkParams: { userId: 'u1' },
}

const mockPostMessage = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  ;(window as any).ReactNativeWebView = { postMessage: mockPostMessage }
})
afterEach(() => {
  delete (window as any).ReactNativeWebView
})

describe('AttendanceCard', () => {
  it('근무시간 텍스트 렌더링', () => {
    const { getByText } = render(<AttendanceCard record={baseRecord} />)
    expect(getByText('오늘 근무시간은 9시부터 18시 입니다.')).toBeTruthy()
  })

  it('출근 확인 메시지 렌더링', () => {
    const { getByText } = render(<AttendanceCard record={baseRecord} />)
    expect(getByText('출근 10분 전입니다. 출근 확인 하시겠습니까?')).toBeTruthy()
  })

  it('출근 확인하기 버튼 렌더링', () => {
    const { getByText } = render(<AttendanceCard record={baseRecord} />)
    expect(getByText('출근 확인하기')).toBeTruthy()
  })

  it('버튼 클릭 시 ReactNativeWebView.postMessage 호출', () => {
    const { getByText } = render(<AttendanceCard record={baseRecord} />)
    fireEvent.click(getByText('출근 확인하기'))
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'deeplink', url: 'app://attendance', params: { userId: 'u1' } })
    )
  })

  it('분이 있는 경우 근무시간 포맷 (9:30 출근)', () => {
    const { getByText } = render(
      <AttendanceCard record={{ ...baseRecord, startHour: 9, startMinute: 30 }} />
    )
    expect(getByText('오늘 근무시간은 9시 30분부터 18시 입니다.')).toBeTruthy()
  })
})
