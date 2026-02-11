'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';
import { calculateTargetsFromGoal } from '@/lib/ai';

const ACTIVITY_LEVELS = [
    { value: 1.2, label: 'Sedentario', desc: 'Lavoro d\'ufficio' },
    { value: 1.375, label: 'Leggero', desc: 'Allenamento 1-2 volte' },
    { value: 1.55, label: 'Moderato', desc: 'Allenamento 3-5 volte' },
    { value: 1.725, label: 'Attivo', desc: 'Allenamento 6-7 volte' },
    { value: 1.9, label: 'Atleta', desc: 'Professionista' },
];

export default function ProfilePage() {
    const authContext = useAuth();
    const router = useRouter();
    const user = authContext?.user;
    const authLoading = authContext?.loading ?? true;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calculatingAI, setCalculatingAI] = useState(false);

    // Profile data
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('male');
    const [activityLevel, setActivityLevel] = useState(1.55);
    const [goalDescription, setGoalDescription] = useState('');

    // Calculated targets
    const [targetCalories, setTargetCalories] = useState(2000);
    const [protein, setProtein] = useState(150);
    const [carbs, setCarbs] = useState(200);
    const [fat, setFat] = useState(60);
    const [aiExplanation, setAiExplanation] = useState('');

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) loadProfile();
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
                setGoalDescription(profile.goalDescription || '');
                setTargetCalories(profile.targetCalories || 2000);
                setProtein(profile.protein || 150);
                setCarbs(profile.carbs || 200);
                setFat(profile.fat || 60);
                setAiExplanation(profile.aiExplanation || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAICalculate = async () => {
        if (!weight || !height || !age || !goalDescription) {
            alert('Inserisci peso, altezza, età e una descrizione dell\'obiettivo!');
            return;
        }

        setCalculatingAI(true);
        try {
            const results = await calculateTargetsFromGoal(goalDescription, {
                weight: parseFloat(weight),
                height: parseFloat(height),
                age: parseInt(age),
                sex,
                activityLevel
            });

            setTargetCalories(results.targetCalories);
            setProtein(results.protein);
            setCarbs(results.carbs);
            setFat(results.fat);
            setAiExplanation(results.explanation);
        } catch (error) {
            alert(error.message);
        } finally {
            setCalculatingAI(false);
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
                goalDescription,
                targetCalories,
                protein,
                carbs,
                fat,
                aiExplanation
            });
            router.push('/');
        } catch (error) {
            alert('Errore nel salvataggio: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading || !user) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-[#111811] dark:text-white transition-colors duration-300 antialiased font-sans">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-8 flex items-center justify-between border-b-4 border-[#dbe6db]/30 shadow-md">
                <button onClick={() => router.push('/')} className="w-24 h-24 flex items-center justify-center rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-90 shadow-sm">
                    <span className="material-symbols-outlined text-7xl font-black">arrow_back</span>
                </button>
                <h1 className="text-5xl font-black italic tracking-tight uppercase">PROFILO</h1>
                <div className="w-24"></div>
            </div>

            <main className="w-full p-4 space-y-12 pb-48">
                {/* Personal Info */}
                <section className="bg-white dark:bg-[#1a2e1a] rounded-[3rem] p-10 shadow-xl border-4 border-[#dbe6db] dark:border-white/10 space-y-10">
                    <div className="flex items-center gap-4 mb-4 text-primary">
                        <span className="material-symbols-outlined text-5xl">person</span>
                        <h2 className="font-black text-3xl uppercase tracking-widest italic">Dati Fisici</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-xl font-black text-[#618961] uppercase tracking-tighter block ml-2">Peso (kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full h-24 bg-[#f6f8f6] dark:bg-black/20 border-4 border-[#dbe6db] dark:border-white/10 rounded-3xl px-8 text-4xl font-black focus:border-primary outline-none transition-all"
                                placeholder="70"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xl font-black text-[#618961] uppercase tracking-tighter block ml-2">Altezza (cm)</label>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="w-full h-24 bg-[#f6f8f6] dark:bg-black/20 border-4 border-[#dbe6db] dark:border-white/10 rounded-3xl px-8 text-4xl font-black focus:border-primary outline-none transition-all"
                                placeholder="175"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xl font-black text-[#618961] uppercase tracking-tighter block ml-2">Età</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full h-24 bg-[#f6f8f6] dark:bg-black/20 border-4 border-[#dbe6db] dark:border-white/10 rounded-3xl px-8 text-4xl font-black focus:border-primary outline-none transition-all"
                                placeholder="30"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xl font-black text-[#618961] uppercase tracking-tighter block ml-2">Sesso</label>
                            <select
                                value={sex}
                                onChange={(e) => setSex(e.target.value)}
                                className="w-full h-24 bg-[#f6f8f6] dark:bg-black/20 border-4 border-[#dbe6db] dark:border-white/10 rounded-3xl px-8 text-3xl font-black focus:border-primary outline-none appearance-none cursor-pointer"
                            >
                                <option value="male">Uomo</option>
                                <option value="female">Donna</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Activity Level */}
                <section className="bg-white dark:bg-[#1a2e1a] rounded-[3rem] p-10 shadow-xl border-4 border-[#dbe6db] dark:border-white/10">
                    <div className="flex items-center gap-4 mb-8 text-primary">
                        <span className="material-symbols-outlined text-5xl">directions_run</span>
                        <h2 className="font-black text-3xl uppercase tracking-widest italic">Livello Attività</h2>
                    </div>

                    <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar">
                        {ACTIVITY_LEVELS.map((level) => {
                            const isSelected = activityLevel === level.value;
                            return (
                                <button
                                    key={level.value}
                                    onClick={() => setActivityLevel(level.value)}
                                    className={`flex-shrink-0 px-10 py-10 rounded-[3rem] border-4 transition-all text-center min-w-[240px] ${isSelected
                                        ? 'bg-primary text-black border-primary font-black shadow-2xl shadow-primary/40'
                                        : 'bg-[#f6f8f6] dark:bg-black/20 text-[#618961] border-[#dbe6db] dark:border-white/10'
                                        }`}
                                >
                                    <div className="text-3xl font-black">{level.label}</div>
                                    <div className={`text-xl mt-3 font-bold ${isSelected ? 'text-black/70' : 'text-[#88a888]'}`}>{level.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* AI GOAL DESCRIPTION */}
                <section className="bg-white dark:bg-[#1a2e1a] rounded-[3rem] p-10 shadow-xl border-4 border-[#dbe6db] dark:border-white/10 space-y-8">
                    <div className="flex items-center gap-4 mb-2 text-primary">
                        <span className="material-symbols-outlined text-5xl">auto_awesome</span>
                        <h2 className="font-black text-3xl uppercase tracking-widest italic">Obiettivo AI</h2>
                    </div>

                    <p className="text-xl font-bold text-[#618961]">Cosa vuoi ottenere? (es: "Perdere 5kg per l'estate")</p>

                    <textarea
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        placeholder="Esempio: Vorrei calare di 5 chili..."
                        className="w-full bg-[#f6f8f6] dark:bg-black/20 border-4 border-[#dbe6db] dark:border-white/10 rounded-[2.5rem] px-8 py-8 text-3xl font-bold focus:border-primary outline-none transition-all h-64 resize-none"
                    />

                    <button
                        onClick={handleAICalculate}
                        disabled={calculatingAI || !goalDescription}
                        className="w-full h-24 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-2xl flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 transition-transform shadow-xl"
                    >
                        {calculatingAI ? (
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-4xl">psychology</span>
                                CALCOLA OBIETTIVI AI
                            </>
                        )}
                    </button>
                </section>

                {/* Results Card */}
                <section className="bg-primary rounded-[4rem] p-12 shadow-2xl shadow-primary/30 text-black space-y-12">
                    <div className="text-center">
                        <p className="text-xl font-black uppercase tracking-[0.3em] opacity-80">TARGET GIORNALIERO</p>
                        <div className="text-[10rem] font-black mt-2 leading-none flex items-center justify-center gap-2">
                            {targetCalories}
                            <span className="text-4xl font-black opacity-60">kcal</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 bg-black/10 rounded-[3rem] p-8 border-2 border-black/5">
                        <div className="text-center">
                            <p className="text-xl font-bold opacity-60 italic">PROT</p>
                            <p className="text-4xl font-black">{protein}g</p>
                        </div>
                        <div className="text-center border-x-4 border-black/10 px-4">
                            <p className="text-xl font-bold opacity-60 italic">CARB</p>
                            <p className="text-4xl font-black">{carbs}g</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold opacity-60 italic">GRASSI</p>
                            <p className="text-4xl font-black">{fat}g</p>
                        </div>
                    </div>

                    {aiExplanation && (
                        <div className="bg-white/90 rounded-[3rem] p-10 text-2xl leading-relaxed italic border-4 border-primary/20 shadow-xl font-bold">
                            <span className="font-black flex items-center gap-4 mb-4 not-italic opacity-80 text-primary">
                                <span className="material-symbols-outlined text-5xl">psychology</span>
                                CONSIGLIO DEL COACH:
                            </span>
                            "{aiExplanation}"
                        </div>
                    )}
                </section>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-28 bg-[#111811] dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-6"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-12 w-12 border-8 border-primary border-t-transparent"></div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-6xl">check_circle</span>
                            SALVA PROFILO
                        </>
                    )}
                </button>
            </main>
        </div>
    );
}
