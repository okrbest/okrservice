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
      deeplinkParams?: object
    }},
    { models }: IContext
  ) {
    return models.WorkSchedules.findOneAndUpdate(
      { userId: input.userId },
      { $set: input },
      { upsert: true, new: true }
    )
  },

  async workScheduleDelete(
    _root: any,
    { userId }: { userId: string },
    { models }: IContext
  ) {
    await models.WorkSchedules.deleteOne({ userId })
    return true
  },
}

export default workScheduleMutations
