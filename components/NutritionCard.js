'use client';

import { Pencil, Trash2 } from 'lucide-react';

export default function NutritionCard({ meal, onEdit, onDelete }) {
    if (!meal) return null;

    return (
        <div className="glass-panel rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white capitalize leading-tight" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{meal.name}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }}>
                        {/* Ora */}
                        <div style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            marginRight: '12px'
                        }}>
                            <span style={{ fontSize: '1.1rem', color: '#93c5fd', fontWeight: 'bold' }}>
                                {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {/* Info e Data */}
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.1rem', color: '#9ca3af' }}>
                            {meal.quantity && (
                                <span style={{ color: '#d1d5db', fontWeight: 600, marginRight: '10px' }}>{meal.quantity}g</span>
                            )}
                            {meal.quantity && <span style={{ width: '5px', height: '5px', backgroundColor: '#6b7280', borderRadius: '50%', marginRight: '10px' }}></span>}
                            <span>{new Date(meal.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <span className="font-bold gradient-text" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{meal.calories}</span>
                        <span className="text-gray-400 block uppercase tracking-wider font-bold" style={{ fontSize: '0.9rem' }}>Kcal</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(meal);
                            }}
                            className="p-2 rounded-full bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700 transition"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete(meal); }}
                            className="p-2 rounded-full bg-slate-800/50 text-gray-400 hover:text-red-400 hover:bg-slate-700 transition"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
                <MacroItem label="Proteine" value={meal.protein} color="bg-blue-500" bgColor="rgba(30, 64, 175, 0.3)" iconColor="#60a5fa" />
                <MacroItem label="Carbi" value={meal.carbs} color="bg-emerald-500" bgColor="rgba(6, 95, 70, 0.3)" iconColor="#34d399" />
                <MacroItem label="Grassi" value={meal.fat} color="bg-amber-500" bgColor="rgba(146, 64, 14, 0.3)" iconColor="#fbbf24" />
            </div>

            {meal.analysis && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-base text-gray-300 italicLeading-relaxed">"{meal.analysis}"</p>
                </div>
            )}
        </div>
    );
}

function MacroItem({ label, value, color, bgColor, iconColor }) {
    return (
        <div className="rounded-2xl p-4 text-center border transition hover:scale-[1.02]" style={{ backgroundColor: bgColor, borderColor: `${iconColor}30` }}>
            <div className="text-white mb-0.5 font-black" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{value}g</div>
            <div className="uppercase tracking-widest mb-3 font-bold" style={{ color: iconColor, fontSize: '0.85rem' }}>{label}</div>
            <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${iconColor}20`, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div className={`h-full ${color} w-full rounded-full opacity-90`}></div>
            </div>
        </div>
    );
}
