'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';
import { ArrowLeft, Save, User, Activity, Target, Calculator } from 'lucide-react';

const ACTIVITY_LEVELS = [
    { value: 1.2, label: 'Sedentario', desc: 'Poco o nessun esercizio' },
    { value: 1.375, label: 'Leggero', desc: 'Esercizio 1-3 giorni/settimana' },
    { value: 1.55, label: 'Moderato', desc: 'Esercizio 3-5 giorni/settimana' },
    { value: 1.725, label: 'Attivo', desc: 'Esercizio 6-7 giorni/settimana' },
    { value: 1.9, label: 'Molto Attivo', desc: 'Atleta / lavoro fisico intenso' },
];

const GOALS = [
    { value: -500, label: 'Dimagrire', desc: '-500 kcal/giorno (-0.5kg/sett.)' },
    { value: 0, label: 'Mantenere', desc: 'Peso stabile' },
    { value: 300, label: 'Aumentare', desc: '+300 kcal/giorno (massa)' },
];

export default function ProfilePage() {
    const authContext = useAuth();
    const router = useRouter();

    const user = authContext?.user;
    const authLoading = authContext?.loading ?? true;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile data
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('male');
    const [activityLevel, setActivityLevel] = useState(1.55);
    const [goal, setGoal] = useState(0);

    // Auth protection
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Load profile
    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const profile = await getUserProfile();
            if (profile) {
                setWeight(profile.weight || '');
                setHeight(profile.height || '');
                setAge(profile.age || '');
                setSex(profile.sex || 'male');
                setActivityLevel(profile.activityLevel || 1.55);
                setGoal(profile.goal || 0);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveUserProfile({
                weight: parseFloat(weight),
                height: parseFloat(height),
                age: parseInt(age),
                sex,
                activityLevel,
                goal,
                tdee: calculateTDEE(),
                targetCalories: calculateTargetCalories(),
            });
            router.push('/');
        } catch (error) {
            alert('Errore nel salvataggio: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Mifflin-St Jeor Formula
    const calculateBMR = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseInt(age);

        if (!w || !h || !a) return 0;

        if (sex === 'male') {
            return 10 * w + 6.25 * h - 5 * a + 5;
        } else {
            return 10 * w + 6.25 * h - 5 * a - 161;
        }
    };

    const calculateTDEE = () => {
        return Math.round(calculateBMR() * activityLevel);
    };

    const calculateTargetCalories = () => {
        return calculateTDEE() + goal;
    };

    const calculateMacros = () => {
        const target = calculateTargetCalories();
        const w = parseFloat(weight) || 70;

        // Protein: 2g per kg bodyweight
        const protein = Math.round(w * 2);
        // Fat: 25% of calories
        const fat = Math.round((target * 0.25) / 9);
        // Carbs: remaining calories
        const carbs = Math.round((target - (protein * 4) - (fat * 9)) / 4);

        return { protein, carbs, fat };
    };

    if (authLoading || loading || !user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const tdee = calculateTDEE();
    const targetCalories = calculateTargetCalories();
    const macros = calculateMacros();
    const isValid = weight && height && age;

    return (
        <div className="min-h-screen pb-8 px-4 pt-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push('/')}
                    className="h-10 w-10 glass-panel rounded-full flex items-center justify-center text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-white">Il Mio Profilo</h1>
            </div>

            <div className="space-y-8">



                {/* Personal Info Section */}
                <section className="glass-panel p-5 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Dati Personali
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Peso (kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="70"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Altezza (cm)</label>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="175"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Età</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="30"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Sesso</label>
                            <select
                                value={sex}
                                onChange={(e) => setSex(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="male">Uomo</option>
                                <option value="female">Donna</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Activity Level */}
                <section className="glass-panel p-5 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        Livello Attività
                    </h2>

                    <div className="space-y-2">
                        {ACTIVITY_LEVELS.map((level) => {
                            const isSelected = activityLevel === level.value;
                            return (
                                <button
                                    key={level.value}
                                    onClick={() => setActivityLevel(level.value)}
                                    className="w-full text-left p-4 rounded-xl border-2 transition"
                                    style={{
                                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(30, 41, 59, 0.5)',
                                        borderColor: isSelected ? '#34d399' : '#334155',
                                        boxShadow: isSelected ? '0 10px 25px rgba(16, 185, 129, 0.3)' : 'none'
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div style={{ color: isSelected ? '#6ee7b7' : '#ffffff', fontWeight: 600 }}>{level.label}</div>
                                            <div className="text-sm text-gray-400">{level.desc}</div>
                                        </div>
                                        {isSelected && (
                                            <div style={{ width: 28, height: 28, backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Goal */}
                <section className="glass-panel p-5 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Target size={20} className="text-amber-400" />
                        Obiettivo
                    </h2>

                    <div className="grid grid-cols-3 gap-2">
                        {GOALS.map((g) => {
                            const isSelected = goal === g.value;
                            return (
                                <button
                                    key={g.value}
                                    onClick={() => setGoal(g.value)}
                                    className="p-4 rounded-xl border-2 transition text-center"
                                    style={{
                                        backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(30, 41, 59, 0.5)',
                                        borderColor: isSelected ? '#fbbf24' : '#334155',
                                        boxShadow: isSelected ? '0 10px 25px rgba(245, 158, 11, 0.3)' : 'none'
                                    }}
                                >
                                    <div style={{ color: isSelected ? '#fcd34d' : '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>{g.label}</div>
                                    {isSelected && (
                                        <div style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '0.25rem' }}>✓</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Results */}
                {isValid && (
                    <section className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-blue-400" />
                            Il Tuo Fabbisogno
                        </h2>

                        <div className="text-center mb-4">
                            <div className="text-5xl font-black text-white">{targetCalories}</div>
                            <div className="text-gray-400">kcal / giorno</div>
                        </div>

                        <div className="flex justify-around text-center">
                            <div>
                                <div className="text-2xl font-bold text-blue-400">{macros.protein}g</div>
                                <div className="text-xs text-gray-500">Proteine</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-400">{macros.carbs}g</div>
                                <div className="text-xs text-gray-500">Carboidrati</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-400">{macros.fat}g</div>
                                <div className="text-xs text-gray-500">Grassi</div>
                            </div>
                        </div>

                        <div className="mt-4 text-xs text-gray-500 text-center">
                            TDEE base: {tdee} kcal • Obiettivo: {goal > 0 ? '+' : ''}{goal} kcal
                        </div>
                    </section>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition active:scale-95"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        <>
                            <Save size={20} />
                            Salva Profilo
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
