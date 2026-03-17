import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../../test/utils'
import { TrendChart } from '../TrendChart'

// Mock Recharts - it requires DOM measurements that jsdom does not provide
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )
  const MockLineChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-count={data.length}>{children}</div>
  )
  const MockBarChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-count={data.length}>{children}</div>
  )
  const MockLine = ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} />
  )
  const MockBar = ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid="bar" data-key={dataKey} data-name={name} />
  )
  const Noop = () => null

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    BarChart: MockBarChart,
    Line: MockLine,
    Bar: MockBar,
    XAxis: Noop,
    YAxis: Noop,
    CartesianGrid: Noop,
    Tooltip: Noop,
    Legend: Noop,
  }
})

describe('TrendChart', () => {
  const sampleData = [
    { completed_at: '2025-06-10T10:00:00Z', accuracy: 80 },
    { completed_at: '2025-06-11T10:00:00Z', accuracy: 85 },
    { completed_at: '2025-06-12T10:00:00Z', accuracy: 90 },
  ]

  it('renders a line chart by default with data', () => {
    render(
      <TrendChart
        data={sampleData}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
      />
    )

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line')).toHaveAttribute('data-key', 'accuracy')
    expect(screen.getByTestId('line')).toHaveAttribute('data-name', 'Accuracy')
  })

  it('renders a bar chart when chartType is bar', () => {
    render(
      <TrendChart
        data={sampleData}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
        chartType="bar"
      />
    )

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar')).toHaveAttribute('data-key', 'accuracy')
  })

  it('renders empty state when data is empty', () => {
    render(
      <TrendChart
        data={[]}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
      />
    )

    expect(screen.getByText('parent:noChartData')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('renders empty state when data is null-ish', () => {
    render(
      <TrendChart
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={null as unknown as any[]}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
      />
    )

    expect(screen.getByText('parent:noChartData')).toBeInTheDocument()
  })

  it('aggregates data by day when aggregateByDay is true', () => {
    const dupeData = [
      { start_time: '2025-06-10T08:00:00Z', words_reviewed: 10 },
      { start_time: '2025-06-10T14:00:00Z', words_reviewed: 15 },
      { start_time: '2025-06-11T10:00:00Z', words_reviewed: 20 },
    ]

    render(
      <TrendChart
        data={dupeData}
        dataKey="words_reviewed"
        xAxisKey="start_time"
        name="Words"
        aggregateByDay={true}
        chartType="bar"
      />
    )

    // After aggregation: 2 unique days
    const chart = screen.getByTestId('bar-chart')
    expect(chart).toHaveAttribute('data-count', '2')
  })

  it('processes non-aggregated data with unique keys', () => {
    render(
      <TrendChart
        data={sampleData}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
      />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-count', '3')
  })

  it('handles SQLite space-separated datetime format', () => {
    const sqliteData = [
      { start_time: '2025-06-10 08:00:00', words_reviewed: 10 },
      { start_time: '2025-06-10 14:00:00', words_reviewed: 15 },
      { start_time: '2025-06-11 10:00:00', words_reviewed: 20 },
    ]

    render(
      <TrendChart
        data={sqliteData}
        dataKey="words_reviewed"
        xAxisKey="start_time"
        name="Words"
        aggregateByDay={true}
        chartType="bar"
      />
    )

    const chart = screen.getByTestId('bar-chart')
    expect(chart).toHaveAttribute('data-count', '2')
  })

  it('uses custom color prop', () => {
    render(
      <TrendChart
        data={sampleData}
        dataKey="accuracy"
        xAxisKey="completed_at"
        name="Accuracy"
        color="#ff0000"
      />
    )

    // Component renders with the custom color - verifying it does not crash
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
