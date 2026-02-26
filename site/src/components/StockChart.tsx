import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { date: string; close: number };

export default function StockChart({
  title,
  points,
}: {
  title: string;
  points: Point[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fill: "var(--muted-foreground)" }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="close"
              stroke="var(--primary)" // uses CSS variable for primary color
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}