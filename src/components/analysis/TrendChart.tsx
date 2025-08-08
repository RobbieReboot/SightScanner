import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TrendDataPoint {
  date: string;
  scan_date: string; // Original date string for sorting
  percent_affected?: number;
  confidence?: number;
  sym_lr?: number;
  sym_tb?: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  metric: 'percent_affected' | 'confidence' | 'sym_lr' | 'sym_tb';
  title: string;
  color: string;
  unit?: string;
}

const TrendChart = ({ data, metric, title, color, unit = '' }: TrendChartProps) => {
  // Filter out data points where the metric is undefined
  const validData = data.filter(point => point[metric] !== undefined && point[metric] !== null);

  const formatTooltipValue = (value: number) => {
    if (metric === 'confidence' || metric === 'percent_affected') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return `${value.toFixed(3)}${unit}`;
  };

  const formatYAxisValue = (value: number) => {
    if (metric === 'confidence' || metric === 'percent_affected') {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">Date: {label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Value: {formatTooltipValue(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (validData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">{title}</p>
          <p className="text-sm">No data available for this metric</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={validData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxisValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={metric} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
