import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chatbotTheme } from '../chatbotTheme';

export type WorkStatusChartData = {
  label: string;
  value: number;
  color: string;
}[];

export default function WorkStatusBarChart({
  data,
}: {
  data: WorkStatusChartData;
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chatbotTheme.color.border} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: chatbotTheme.color.mutedForeground, fontSize: 12 }}
          axisLine={{ stroke: chatbotTheme.color.border }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: chatbotTheme.color.mutedForeground, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: chatbotTheme.color.accentSoft }}
          contentStyle={{
            background: chatbotTheme.color.card,
            border: `1px solid ${chatbotTheme.color.border}`,
            borderRadius: chatbotTheme.radius.sm,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell key={`${d.label}-${i}`} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
