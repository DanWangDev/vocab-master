import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataItem = Record<string, any>;

interface TrendChartProps {
    data: ChartDataItem[];
    dataKey: string;
    xAxisKey: string;
    color?: string;
    name: string;
    aggregateByDay?: boolean;
    chartType?: 'line' | 'bar';
}

function parseDateStr(dateStr: string): Date {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    return new Date(normalized);
}

function toLocalDateKey(dateStr: string): string {
    const date = parseDateStr(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
    const date = parseDateStr(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function aggregateByDayFn(data: ChartDataItem[], xAxisKey: string, dataKey: string): ChartDataItem[] {
    const dayMap = new Map<string, number>();

    data.forEach(item => {
        const dateStr = item[xAxisKey];
        if (!dateStr) return;

        const dayKey = toLocalDateKey(dateStr);

        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + (item[dataKey] || 0));
    });

    return Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dayKey, total]) => ({
            _xKey: dayKey,
            [dataKey]: total,
        }));
}

export function TrendChart({
    data,
    dataKey,
    xAxisKey,
    color = '#8884d8',
    name,
    aggregateByDay: shouldAggregate = false,
    chartType = 'line'
}: TrendChartProps) {
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        if (shouldAggregate) {
            return aggregateByDayFn(data, xAxisKey, dataKey);
        }

        return data.map((item, i) => ({
            ...item,
            _xKey: `${i}`,
            _label: formatDateLabel(item[xAxisKey] ?? ''),
        }));
    }, [data, xAxisKey, dataKey, shouldAggregate]);

    const { t } = useTranslation('parent');

    if (!processedData || processedData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
                {t('noChartData')}
            </div>
        );
    }

    const tickFormatter = shouldAggregate
        ? (val: string) => formatDateLabel(val)
        : (_val: string, index: number) => processedData[index]?._label ?? '';

    const chartProps = {
        data: processedData,
        margin: { top: 5, right: 20, bottom: 5, left: 0 },
    };

    const xAxisProps = {
        dataKey: '_xKey',
        stroke: '#9ca3af',
        fontSize: 12,
        tickLine: false as const,
        axisLine: false as const,
        tickFormatter,
    };

    const yAxisProps = {
        stroke: '#9ca3af',
        fontSize: 12,
        tickLine: false as const,
        axisLine: false as const,
    };

    const tooltipProps = {
        contentStyle: {
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: 'none',
        },
        labelFormatter: shouldAggregate
            ? (val: string) => formatDateLabel(val)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (_val: string, payload: readonly any[]) => {
                if (payload && payload[0]) {
                    return payload[0].payload._label || '';
                }
                return '';
            },
    };

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart {...chartProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        <Legend />
                        <Bar
                            dataKey={dataKey}
                            name={name}
                            fill={color}
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                ) : (
                    <LineChart {...chartProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            name={name}
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 4, fill: color, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
