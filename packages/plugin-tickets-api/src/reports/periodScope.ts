import * as dayjs from 'dayjs';

// 인사이트 상단 조회기간을 "한 달"·"한 해" 단위 차트에 맞춰 줄 때 쓰는 기준일.
// 기간의 마지막 날을 쓰되, 아직 오지 않은 날(올해·이번 주의 끝)이면 오늘, 기간이 없으면(전체) 오늘.
export const getPeriodReferenceDate = (
  range: { $lte?: Date },
  now: Date = new Date(),
): Date => {
  const end = range?.$lte?.getTime();

  // 잘못된 날짜(Invalid Date)도 기간이 없는 것으로 본다
  if (!end || Number.isNaN(end) || end > now.getTime()) {
    return now;
  }

  return range.$lte as Date;
};

// 위 범위를 계산한 서버 현지 시간대(예: "+09:00"). DB에서 날짜를 달로 묶을 때 같은 기준을 쓰도록 넘긴다.
// 넘기지 않으면 UTC로 묶여 매달 1일 새벽(한국 0~9시)이 지난달로 들어간다.
export const getPeriodTimezone = () => dayjs().format('Z');

export const getMonthRangeOf = (date: Date) => ({
  $gte: dayjs(date).startOf('month').toDate(),
  $lte: dayjs(date).endOf('month').toDate(),
});

export const getYearRangeOf = (date: Date) => ({
  $gte: dayjs(date).startOf('year').toDate(),
  $lte: dayjs(date).endOf('year').toDate(),
});
