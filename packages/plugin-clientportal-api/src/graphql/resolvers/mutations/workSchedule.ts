import { IContext } from '../../../connectionResolver'

const workScheduleMutations = {
  async workScheduleUpsert(
    _root: any,
    { input }: { input: {
      userId: string
      startHour: number
      startMinute: number
      endHour: number
      endMinute: number
      deeplinkUrl: string
      deeplinkParams?: Record<string, string>
    }},
    { models }: IContext
  ) {
    try {
      return models.WorkSchedules.findOneAndUpdate(
        { userId: input.userId },
        { $set: input },
        { upsert: true, new: true }
      )
    } catch (error) {
      throw new Error(`근무 스케줄 저장 실패: ${(error as Error).message}`)
    }
  },

  async workScheduleDelete(
    _root: any,
    { userId }: { userId: string },
    { models }: IContext
  ) {
    try {
      await models.WorkSchedules.deleteOne({ userId })
      return true
    } catch (error) {
      throw new Error(`근무 스케줄 삭제 실패: ${(error as Error).message}`)
    }
  },
}

export default workScheduleMutations
