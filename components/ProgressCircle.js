'use client';

export default function ProgressCircle({ value, target }) {
    const percentage = Math.min((value / target) * 100, 100);
    const remaining = Math.max(target - value, 0);
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center py-8">
            {/* Progress Circle SVG */}
            <svg className="w-64 h-64 progress-ring" viewBox="0 0 200 200">
                {/* Background Circle */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="#E5E7EB"
                    strokeWidth="14"
                />
                {/* Progress Circle - Verde Smeraldo */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold leading-none" style={{ color: '#1E293B' }}>
                    {remaining.toLocaleString('it-IT')}
                </span>
                <span className="text-sm font-normal mt-2" style={{ color: '#64748B' }}>
                    kcal rimanenti
                </span>
            </div>
        </div>
    );
}
