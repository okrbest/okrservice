import { generateModels } from '../connectionResolver'
import { sendNotification } from '../utils'

/**
 * 현재 시각(HH:MM)이 출근 10분 전인지 확인
 */
export function isAttendanceWindowNow(
  startHour: number,
  startMinute: number,
  nowHour: number,
  nowMinute: number
): boolean {
  const startTotal = startHour * 60 + startMinute
  const nowTotal = nowHour * 60 + nowMinute
  return startTotal - nowTotal === 10
}

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD, KST)
 */
export function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function runAttendancePushCheck(subdomain: string): Promise<void> {
  const models = await generateModels(subdomain)

  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const nowHour = kst.getUTCHours()
  const nowMinute = kst.getUTCMinutes()
  const today = kst.toISOString().slice(0, 10)

  const schedules = await models.WorkSchedules.find({
    $or: [
      { lastPushSentDate: { $ne: today } },
      { lastPushSentDate: { $exists: false } },
    ],
  }).lean()

  for (const schedule of schedules) {
    if (!isAttendanceWindowNow(schedule.startHour, schedule.startMinute, nowHour, nowMinute)) {
      continue
    }

    const user = await models.ClientPortalUsers.findOne({
      _id: schedule.userId,
      'deviceTokens.0': { $exists: true },
    }).lean()

    if (!user) continue

    await sendNotification(models, subdomain, {
      receivers: [schedule.userId],
      title: '출근 10분 전입니다',
      content: '출근 확인 하시겠습니까?',
      notifType: 'system',
      link: '',
      isMobile: true,
      eventData: {
        type: 'attendance',
        startHour: String(schedule.startHour),
        startMinute: String(schedule.startMinute),
        endHour: String(schedule.endHour),
        endMinute: String(schedule.endMinute),
        deeplinkUrl: schedule.deeplinkUrl,
        deeplinkParams: JSON.stringify(schedule.deeplinkParams || {}),
      },
    })

    await models.WorkSchedules.updateOne(
      { _id: schedule._id },
      { $set: { lastPushSentDate: today } }
    )
  }
}

export function startAttendanceScheduler(subdomain: string): NodeJS.Timeout {
  return setInterval(() => {
    runAttendancePushCheck(subdomain).catch((err) => {
      console.error('출근 알림 스케줄러 오류:', err)
    })
  }, 60_000)
}
