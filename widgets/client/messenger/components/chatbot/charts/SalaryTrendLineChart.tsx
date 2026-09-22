import * as React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chatbotTheme } from '../chatbotTheme';

export type SalaryTrendChartData = Record<string, string | number>[];
export type SalaryTrendSeriesMeta = {
  key: string;
  name: string;
  color: string;
}[];

export default function SalaryTrendLineChart({
  data,
  series,
}: {
  data: SalaryTrendChartData;
  series: SalaryTrendSeriesMeta;
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chatbotTheme.color.border} vertical={false} />
        <XAxis
          dataKey="__x"
          tick={{ fill: chatbotTheme.color.mutedForeground, fontSize: 12 }}
          axisLine={{ stroke: chatbotTheme.color.border }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: chatbotTheme.color.mutedForeground, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: chatbotTheme.color.card,
            border: `1px solid ${chatbotTheme.color.border}`,
            borderRadius: chatbotTheme.radius.sm,
            fontSize: 12,
          }}
        />
        {series.length > 1 ? (
          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: chatbotTheme.color.mutedForeground,
            }}
          />
        ) : null}
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={i === 0 ? 2.5 : 1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
