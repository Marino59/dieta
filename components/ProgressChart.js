'use client';

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-500 italic">
                Nessun dato disponibile ancora.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        tick={{ fontSize: 12 }}
                    />
                    {/* Left Axis: Calories (Bars) */}
                    <YAxis
                        yAxisId="left"
                        stroke="#ef4444"
                        orientation="left"
                        label={{ value: 'Kcal', angle: -90, position: 'insideLeft', offset: 0, fill: '#ef4444' }}
                    />
                    {/* Right Axis: Weight (Line) */}
                    <YAxis
                        yAxisId="right"
                        stroke="#3b82f6"
                        orientation="right"
                        domain={['auto', 'auto']}
                        label={{ value: 'Kg', angle: 90, position: 'insideRight', offset: 0, fill: '#3b82f6' }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="calories" name="Calorie" fill="#ef4444" barSize={20} radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Line yAxisId="right" type="monotone" dataKey="weight" name="Peso (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
