export default function NutrientRings({
    calories, targetCalories,
    protein, targetProtein,
    carbs, targetCarbs,
    fat, targetFat
}) {
    const size = 200;
    const center = size / 2;
    const strokeWidth = 12;
    const gap = 4;

    const rings = [
        { label: 'Calorie', value: calories, target: targetCalories, color: '#3b82f6', radius: 90 }, // Blue
        { label: 'Proteine', value: protein, target: targetProtein, color: '#ef4444', radius: 74 }, // Red
        { label: 'Carboidrati', value: carbs, target: targetCarbs, color: '#10b981', radius: 58 }, // Green
        { label: 'Grassi', value: fat, target: targetFat, color: '#f59e0b', radius: 42 }, // Yellow
    ];

    return (
        <div className="relative flex flex-col items-center justify-center p-6">
            {/* Rings Container */}
            <div className="relative mb-8" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {rings.map((ring, i) => {
                        const circumference = 2 * Math.PI * ring.radius;
                        const percent = Math.min(Math.max(ring.value / ring.target, 0), 1);
                        const offset = circumference - (percent * circumference);

                        return (
                            <g key={ring.label}>
                                {/* Background Ring */}
                                <circle
                                    cx={center}
                                    cy={center}
                                    r={ring.radius}
                                    fill="transparent"
                                    stroke="#1e293b" // slate-800
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                />
                                {/* Progress Ring */}
                                <circle
                                    cx={center}
                                    cy={center}
                                    r={ring.radius}
                                    fill="transparent"
                                    stroke={ring.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Center Stats (Total Calories) - REMOVED */}
            </div>

            {/* Legend / Stats Grid */}
            <div className="grid grid-cols-2 gap-4 w-full">
                {rings.map(ring => {
                    // Removed: if (ring.label === 'Calorie') return null; 
                    return (
                        <div key={ring.label} className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-3xl border border-white/5 shadow-lg backdrop-blur-sm">
                            <div className="w-5 h-16 rounded-full shrink-0" style={{ backgroundColor: ring.color, boxShadow: `0 0 15px ${ring.color}50` }} />
                            <div>
                                <div
                                    className="font-black tabular-nums leading-none mb-1"
                                    style={{ fontSize: '2.25rem', color: ring.color }} // 36px, colored number
                                >
                                    {Math.round(ring.value)}
                                    <span style={{ fontSize: '1rem', color: '#94a3b8', marginLeft: '2px' }}>
                                        {ring.label === 'Calorie' ? '' : 'g'}
                                    </span>
                                </div>
                                <div className="text-sm font-bold uppercase tracking-wider opacity-90" style={{ color: ring.color }}>{ring.label}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
