'use client';

import { Pencil, Trash2, Clock } from 'lucide-react';

export default function NutritionCard({ meal, onEdit, onDelete }) {
    if (!meal) return null;

    return (
        <div className="card-modern p-5 animate-fade-in hover:scale-[1.01] transition-transform">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white capitalize truncate text-xl mb-2">
                        {meal.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-xl">
                            <Clock size={14} className="text-blue-400" />
                            <span className="text-blue-300 font-semibold">
                                {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        {meal.quantity && (
                            <span className="text-slate-400 font-medium">{meal.quantity}g</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                        <div className="text-4xl font-black text-gradient-primary leading-none">
                            {meal.calories}
                        </div>
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">
                            Kcal
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(meal);
                            }}
                            className="touch-target p-2.5 glass-panel rounded-xl interactive text-slate-400 hover:text-blue-400"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(meal);
                            }}
                            className="touch-target p-2.5 glass-panel rounded-xl interactive text-slate-400 hover:text-red-400"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <MacroItem
                    label="Proteine"
                    value={meal.protein}
                    gradient="bg-gradient-primary"
                />
                <MacroItem
                    label="Carbs"
                    value={meal.carbs}
                    gradient="bg-gradient-success"
                />
                <MacroItem
                    label="Grassi"
                    value={meal.fat}
                    gradient="bg-gradient-warning"
                />
            </div>

            {meal.analysis && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-sm text-slate-400 italic leading-relaxed">
                        "{meal.analysis}"
                    </p>
                </div>
            )}
        </div>
    );
}

function MacroItem({ label, value, gradient }) {
    return (
        <div className="glass-panel p-3 rounded-2xl text-center interactive">
            <div className={`text-2xl font-black mb-1 ${gradient.replace('bg-', 'text-')}`}>
                {value}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                {label}
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${gradient} w-full rounded-full`}></div>
            </div>
        </div>
    );
}
