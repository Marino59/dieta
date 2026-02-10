'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Trash2, TrendingUp, Monitor, Calendar, Clock, Plus, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { getMeals, deleteMeal, updateMeal, addMeal, getUserProfile, getWeights, addWeight, deleteWeight } from '@/lib/firestore';
import { getDailyCoachAdvice, getHungryAdvice } from "@/lib/ai";
import ConfirmMealModal from '@/components/ConfirmMealModal';
import CameraInput from '@/components/CameraInput';

export default function Home() {
  const authContext = useAuth();
  const user = authContext?.user;
  const authLoading = authContext?.loading ?? true;
  const router = useRouter();

  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingMealData, setPendingMealData] = useState(null);
  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputMode, setInputMode] = useState(null); // 'camera', 'text', 'barcode'
  const [coachAdvice, setCoachAdvice] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [weights, setWeights] = useState([]);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [newWeightValue, setNewWeightValue] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightTime, setWeightTime] = useState(new Date().toTimeString().slice(0, 5));
  const [hungryAdvice, setHungryAdvice] = useState(null);
  const [loadingHungry, setLoadingHungry] = useState(false);

  const handleSetCurrentView = (view) => {
    setCurrentView(view);
    setInputMode(null);
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mealsData, profileData, weightsData] = await Promise.all([
        getMeals(selectedDate),
        getUserProfile(),
        getWeights()
      ]);
      setMeals(mealsData);
      setProfile(profileData);
      setWeights(weightsData);

      // Fetch coach advice with caching
      if (profileData && !coachAdvice) {
        const today = new Date().toISOString().split('T')[0];
        const cached = localStorage.getItem('coachAdviceCache');

        if (cached) {
          const { advice, date } = JSON.parse(cached);
          if (date === today) {
            console.log("Using cached coach advice for today");
            setCoachAdvice(advice);
            setLoadingCoach(false);
            return;
          }
        }

        setLoadingCoach(true);
        try {
          const advice = await getDailyCoachAdvice(profileData, mealsData.reduce((sum, m) => sum + (m.calories || 0), 0));
          setCoachAdvice(advice);
          // Store in cache
          localStorage.setItem('coachAdviceCache', JSON.stringify({ advice, date: today }));
        } catch (err) {
          console.error("Coach advice error:", err);
        } finally {
          setLoadingCoach(false);
        }
      }
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewMeal = async (confirmedData) => {
    try {
      setLoading(true);
      const safeNumber = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : Math.round(num);
      };

      const mealData = {
        name: confirmedData.name || "Pasto sconosciuto",
        quantity: safeNumber(confirmedData.quantity) || 100,
        calories: safeNumber(confirmedData.calories),
        protein: safeNumber(confirmedData.protein),
        carbs: safeNumber(confirmedData.carbs),
        fat: safeNumber(confirmedData.fat),
        analysis: confirmedData.analysis || "",
        created_at: confirmedData.date ? confirmedData.date : new Date()
      };

      if (editingMeal) {
        await updateMeal(editingMeal.id, mealData);
        setMeals((prev) => prev.map(m => m.id === editingMeal.id ? { ...m, ...mealData } : m));
        setEditingMeal(null);
      } else {
        const mealToSave = {
          ...mealData,
          image_path: pendingMealData?.image_path || null,
        };
        const newMeal = await addMeal(mealToSave);
        setMeals((prev) => [newMeal, ...prev]);
      }

      setPendingMealData(null);
      handleSetCurrentView('dashboard');
    } catch (error) {
      console.error("Error saving meal:", error);
      alert(`Errore salvataggio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMealIdentified = (data, imageBase64) => {
    setPendingMealData({ ...data, image_path: imageBase64 });
    handleSetCurrentView('confirm-meal');
  };

  const handleAddWeight = async () => {
    if (!newWeightValue || isNaN(parseFloat(newWeightValue))) return;
    try {
      setLoading(true);
      const [year, month, day] = weightDate.split('-').map(Number);
      const [hours, minutes] = weightTime.split(':').map(Number);
      const finalDate = new Date(year, month - 1, day, hours, minutes);

      const weightEntry = {
        weight: parseFloat(newWeightValue),
        created_at: finalDate
      };
      const newEntry = await addWeight(weightEntry);
      setWeights(prev => [...prev, newEntry].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      setNewWeightValue("");
      setIsAddingWeight(false);
    } catch (error) {
      console.error("Error adding weight:", error);
      alert("Errore salvataggio peso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeight = async (id) => {
    if (!confirm("Eliminare questa pesata?")) return;
    try {
      await deleteWeight(id);
      setWeights(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error("Error deleting weight:", error);
    }
  };

  const handleHoFame = async () => {
    try {
      setLoadingHungry(true);
      setHungryAdvice(null);
      const advice = await getHungryAdvice(profile, totalCalories);
      setHungryAdvice(advice);
    } catch (error) {
      console.error("Ho Fame error:", error);
    } finally {
      setLoadingHungry(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const targetCalories = profile?.targetCalories || 2400;
  const targetProtein = profile?.targetProtein || 150;
  const targetCarbs = profile?.targetCarbs || 300;
  const targetFat = profile?.targetFat || 70;

  const proteinPercentage = Math.min((totalProtein / targetProtein) * 100, 100);
  const fatPercentage = Math.min((totalFat / targetFat) * 100, 100);
  const carbsPercentage = Math.min((totalCarbs / targetCarbs) * 100, 100);

  // SVG Circle calculations
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const dashPercentage = Math.min((totalCalories / targetCalories) * circumference, circumference);
  const strokeDashoffset = circumference - dashPercentage;

  if ((currentView === 'confirm-meal' && pendingMealData) || editingMeal) {
    return (
      <ConfirmMealModal
        mealData={editingMeal || pendingMealData}
        onConfirm={handleSaveNewMeal}
        onCancel={() => {
          setPendingMealData(null);
          setEditingMeal(null);
          handleSetCurrentView('dashboard');
        }}
        isLoading={loading}
        defaultDate={selectedDate}
      />
    );
  }

  if (currentView === 'add-meal') {

    if (inputMode) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 px-4 pt-8">
          <button
            onClick={() => setInputMode(null)}
            className="flex items-center gap-2 text-primary font-bold mb-6"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Indietro
          </button>
          <CameraInput
            onMealIdentified={handleMealIdentified}
            defaultDate={selectedDate}
            initialMode={inputMode}
          />
        </div>
      );
    }

    return (
      <div className="bg-background-light dark:bg-background-dark text-[#111811] dark:text-[#f0f4f0] min-h-screen flex flex-col antialiased font-sans">
        <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-[#e2e8e2] dark:border-[#1e331e] px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleSetCurrentView('dashboard')}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h1 className="text-lg font-bold">Metodo Inserimento</h1>
            <div className="w-10"></div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setInputMode('camera')}
              className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-[#1a2e1a] border border-[#e2e8e2] dark:border-[#1e331e] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                <span className="material-symbols-outlined text-primary text-3xl">photo_camera</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-tight text-[#618961]">Scatta Foto</span>
            </button>

            <button
              onClick={() => setInputMode('text')}
              className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-[#1a2e1a] border border-[#e2e8e2] dark:border-[#1e331e] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20">
                <span className="material-symbols-outlined text-blue-500 text-3xl">edit_note</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-tight text-[#618961]">Descrivi</span>
            </button>

            <button
              onClick={() => setInputMode('barcode')}
              className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-[#1a2e1a] border border-[#e2e8e2] dark:border-[#1e331e] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20">
                <span className="material-symbols-outlined text-amber-500 text-3xl">barcode_scanner</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-tight text-[#618961]">Scansiona</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-[#d1d9d1] dark:border-[#2d4a2d] bg-[#f9faf9] dark:bg-[#152815] rounded-3xl p-8 text-center">
            <div className="w-20 h-20 mb-4 rounded-full bg-[#e8eee8] dark:bg-[#1e331e] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#618961] text-4xl">add_a_photo</span>
            </div>
            <h2 className="text-lg font-semibold text-[#618961]">Inizia l'inserimento</h2>
            <p className="text-sm text-[#88a888] mt-2 max-w-[240px]">Seleziona una delle opzioni sopra per aggiungere il tuo pasto velocemente tramite AI o scansione.</p>
          </div>
        </main>

        <nav className="sticky bottom-0 bg-white/90 dark:bg-[#102210]/90 backdrop-blur-lg border-t border-[#e2e8e2] dark:border-[#1e331e] pb-safe pt-3 px-8 flex justify-between items-center">
          <button
            onClick={() => handleSetCurrentView('dashboard')}
            className="flex flex-col items-center gap-1 text-[#618961]"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            <span className="text-[10px] font-medium">Inserisci</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[#618961]">
            <span className="material-symbols-outlined">restaurant_menu</span>
            <span className="text-[10px] font-medium">Peso</span>
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center gap-1 text-[#618961]"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-medium">Profilo</span>
          </button>
        </nav>
      </div>
    );
  }

  if (currentView === 'weight') {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen text-[#111811] dark:text-white pb-32 flex flex-col antialiased font-sans">
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-[#e2e8e2] dark:border-[#1e331e] px-4 py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSetCurrentView('dashboard')}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary active:scale-90 transition-all"
            >
              <ChevronLeft size={32} />
            </button>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Il Tuo Peso</h1>
            <div className="w-12"></div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 space-y-10">
          {/* Quick Add Section */}
          <section className="bg-white dark:bg-background-dark rounded-[3rem] p-8 border-4 border-[#dbe6db] dark:border-white/10 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 rounded-3xl bg-primary/20 text-primary">
                <TrendingUp size={40} />
              </div>
              <h2 className="text-3xl font-black italic">NUOVA PESATA</h2>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={newWeightValue}
                  onChange={(e) => setNewWeightValue(e.target.value)}
                  placeholder="00.0"
                  className="w-full text-8xl font-black bg-transparent text-center border-b-8 border-primary/20 focus:border-primary outline-none py-4 dark:text-white transition-colors"
                />
                <span className="absolute bottom-6 right-4 text-4xl font-black text-[#618961]">KG</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-3xl flex flex-col items-center gap-2 border border-primary/10">
                  <Calendar className="text-primary" size={24} />
                  <input
                    type="date"
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                    className="bg-transparent text-xl font-bold outline-none text-center w-full"
                  />
                </div>
                <div className="bg-primary/5 p-4 rounded-3xl flex flex-col items-center gap-2 border border-primary/10">
                  <Clock className="text-primary" size={24} />
                  <input
                    type="time"
                    value={weightTime}
                    onChange={(e) => setWeightTime(e.target.value)}
                    className="bg-transparent text-xl font-bold outline-none text-center w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleAddWeight}
                disabled={!newWeightValue || loading}
                className="w-full h-24 rounded-[2rem] bg-primary text-[#111811] font-black text-3xl shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
              >
                {loading ? <Activity className="animate-spin" /> : <Plus size={32} strokeWidth={4} />}
                SALVA PESO
              </button>
            </div>
          </section>

          {/* Simple Chart Visualization */}
          {weights.length > 1 && (
            <section className="bg-white dark:bg-background-dark rounded-[3rem] p-8 border-4 border-[#dbe6db] dark:border-white/10 shadow-xl overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <Activity className="text-primary" size={32} />
                <h2 className="text-2xl font-black italic">ANDAMENTO</h2>
              </div>
              <div className="h-48 w-full relative mt-4">
                <svg className="w-full h-full overflow-visible">
                  {(() => {
                    const minWeight = Math.min(...weights.map(w => w.weight)) - 2;
                    const maxWeight = Math.max(...weights.map(w => w.weight)) + 2;
                    const range = maxWeight - minWeight;
                    const points = weights.map((w, i) => {
                      const x = (i / (weights.length - 1)) * 100;
                      const y = 100 - ((w.weight - minWeight) / range) * 100;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        <polyline
                          points={points}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-primary"
                          vectorEffect="non-scaling-stroke"
                          style={{ strokeLinejoin: 'round', strokeLinecap: 'round' }}
                        />
                        {weights.map((w, i) => {
                          const x = (i / (weights.length - 1)) * 100;
                          const y = 100 - ((w.weight - minWeight) / range) * 100;
                          return (
                            <circle
                              key={w.id}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="6"
                              className="fill-white stroke-primary stroke-[4px]"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between mt-6 px-1 text-sm font-black text-[#618961]">
                <span>{new Date(weights[0].created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                <span>{new Date(weights[weights.length - 1].created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
              </div>
            </section>
          )}

          {/* History List */}
          <section className="space-y-6">
            <h3 className="text-3xl font-black italic ml-4">STORICO</h3>
            <div className="space-y-4">
              {weights.length === 0 ? (
                <p className="text-center text-[#618961] py-12 text-2xl font-bold bg-white dark:bg-background-dark rounded-[2.5rem] border-4 border-[#dbe6db] dark:border-white/10">Nessun dato registrato.</p>
              ) : (
                [...weights].reverse().map(w => (
                  <div key={w.id} className="flex items-center gap-6 bg-white dark:bg-background-dark p-6 rounded-[2.5rem] border-4 border-[#dbe6db] dark:border-white/20 shadow-lg">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <TrendingUp size={32} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-4xl font-black text-[#111811] dark:text-white tracking-tighter">{w.weight}<span className="text-xl ml-1 text-[#618961]">kg</span></h4>
                      <p className="text-lg text-[#618961] font-bold mt-1">
                        {new Date(w.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteWeight(w.id)}
                      className="size-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Trash2 size={28} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t-8 border-[#13ec13]/20 px-8 py-8 pb-14 flex justify-between items-center z-20 shadow-[0_-20px_60px_rgba(0,0,0,0.15)]">
          <button onClick={() => handleSetCurrentView('dashboard')} className="flex flex-col items-center text-[#618961] group">
            <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">home</span>
            <span className="text-3xl font-black mt-2 uppercase tracking-tighter">HOME</span>
          </button>
          <button className="flex flex-col items-center text-primary group">
            <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
            <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PESO</span>
          </button>
          <button className="flex flex-col items-center text-[#618961] group">
            <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">emoji_events</span>
            <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PREMI</span>
          </button>
          <button onClick={() => router.push('/profile')} className="flex flex-col items-center text-[#618961] group">
            <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">account_circle</span>
            <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PROFILO</span>
          </button>
        </nav>
      </div>
    );
  }
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-[#111811] dark:text-white transition-colors duration-300 antialiased font-sans">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 flex flex-col bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-[#dbe6db]/30 shadow-sm">
        <div className="flex items-center px-4 py-8 justify-between">
          <div className="flex size-24 shrink-0 items-center justify-center">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-24 border-4 border-primary shadow-lg"
              style={{
                backgroundImage: user?.photoURL ? `url("${user.photoURL}")` : `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFAmglX_uCu_WV-qOLzoOA-CE_0bUcHzS1_PfOGohbq1vTiE0UrReWotFOAHEkz7FuVQwWJj1YvWUPZTywZaUe87zzgy4JFmR334tzQv7wsF6WTJd_AqR5-SKgjSK2u9ySnFoxPFkP30UMBB4MpHzE6QIeZ9-9ZAxV2AWmwQ_IFtcEY8rKNFB_9_H0QKu4rxqax1AqfAgpKdPy74cfTk7n-s-A27LL0c4_3SdORyyFUXTDwqCelSV3dO1pTwmNSnvxc7TMRYUA1A")`
              }}
            ></div>
          </div>
          <h1 className="text-[#111811] dark:text-white text-5xl font-black leading-tight tracking-tight flex-1 text-center italic">DIETA</h1>
          <div className="flex w-24 items-center justify-end relative">
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                setSelectedDate(newDate);
                // Clear coach advice when changing date to force refresh for that context
                setCoachAdvice(null);
              }}
            />
            <button className="flex cursor-pointer items-center justify-center rounded-2xl h-24 w-24 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-90">
              <span className="material-symbols-outlined text-8xl">calendar_month</span>
            </button>
          </div>
        </div>

        {/* Selected Date Indicator */}
        <div className="px-4 py-4 bg-primary/5 flex items-center justify-center gap-4 border-t border-primary/10">
          <span className="material-symbols-outlined text-4xl text-primary">event</span>
          <h2 className="text-3xl font-black uppercase tracking-widest text-primary italic">
            {selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            {selectedDate.toDateString() === new Date().toDateString() && " (OGGI)"}
          </h2>
        </div>
      </div>

      <main className="w-full pb-32">
        {/* Main Summary Card */}
        <div className="p-4 mt-2">
          <div className="bg-white dark:bg-background-dark rounded-xl p-6 shadow-sm border border-[#dbe6db] dark:border-white/10 flex flex-col items-center">
            <div className="relative flex items-center justify-center mb-10 scale-110">
              {/* Progress Circle */}
              <svg className="w-96 h-96 progress-ring">
                <circle className="text-[#dbe6db] dark:text-white/10" cx="192" cy="192" fill="transparent" r="135" stroke="currentColor" strokeWidth="28" />
                <circle
                  className="text-primary transition-all duration-1000"
                  cx="192"
                  cy="192"
                  fill="transparent"
                  r="135"
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="28"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-4">
                <span className="text-9xl font-black text-[#111811] dark:text-white leading-none">{totalCalories.toLocaleString()}</span>
                <span className="text-4xl text-[#618961] font-black uppercase tracking-widest mt-4">KCAL</span>
                <div className="my-6 h-1.5 w-28 bg-[#dbe6db]"></div>
                <span className="text-2xl text-[#618961] font-black italic">Target: {targetCalories.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-center pt-4">
              <p className="text-3xl font-black text-[#618961]">Rimanenti: <span className="text-[#111811] dark:text-white">{Math.max(0, targetCalories - totalCalories).toLocaleString()} kcal</span></p>
            </div>
          </div>
        </div>

        {/* Macronutrients Grid */}
        <div className="grid grid-cols-3 gap-6 px-4 py-8">
          {/* Protein */}
          <div className="bg-white dark:bg-background-dark rounded-[2.5rem] p-6 border-2 border-[#dbe6db] dark:border-white/20 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-primary mb-3 text-6xl">restaurant_menu</span>
            <p className="text-xl font-black text-[#111811] dark:text-white">PROT</p>
            <div className="w-full bg-[#dbe6db] dark:bg-white/10 h-4 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${proteinPercentage}%` }}></div>
            </div>
            <p className="text-lg text-[#618961] mt-4 font-black">{Math.round(totalProtein)}g</p>
            <p className="text-sm text-[#618961]/60 font-bold">Goal {targetProtein}g</p>
          </div>
          {/* Fats */}
          <div className="bg-white dark:bg-background-dark rounded-[2.5rem] p-6 border-2 border-[#dbe6db] dark:border-white/20 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-primary mb-3 text-6xl">opacity</span>
            <p className="text-xl font-black text-[#111811] dark:text-white">GRASSI</p>
            <div className="w-full bg-[#dbe6db] dark:bg-white/10 h-4 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${fatPercentage}%` }}></div>
            </div>
            <p className="text-lg text-[#618961] mt-4 font-black">{Math.round(totalFat)}g</p>
            <p className="text-sm text-[#618961]/60 font-bold">Goal {targetFat}g</p>
          </div>
          {/* Carbs */}
          <div className="bg-white dark:bg-background-dark rounded-[2.5rem] p-6 border-2 border-[#dbe6db] dark:border-white/20 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-primary mb-3 text-6xl">bakery_dining</span>
            <p className="text-xl font-black text-[#111811] dark:text-white">CARBO</p>
            <div className="w-full bg-[#dbe6db] dark:bg-white/10 h-4 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${carbsPercentage}%` }}></div>
            </div>
            <p className="text-lg text-[#618961] mt-4 font-black">{Math.round(totalCarbs)}g</p>
            <p className="text-sm text-[#618961]/60 font-bold">Goal {targetCarbs}g</p>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-col gap-6 px-4 py-12">
          <button
            onClick={() => handleSetCurrentView('add-meal')}
            className="flex items-center justify-center gap-6 w-full h-28 rounded-[2.5rem] bg-primary text-[#111811] font-black text-3xl shadow-2xl shadow-primary/30 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-6xl">add_circle</span>
            <span>AGGIUNGI PASTO</span>
          </button>

          <button
            onClick={handleHoFame}
            disabled={loadingHungry}
            className="flex items-center justify-center gap-6 w-full h-28 rounded-[2.5rem] bg-amber-400 text-[#111811] font-black text-3xl shadow-2xl shadow-amber-400/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-6xl">{loadingHungry ? 'hourglass_empty' : 'fastfood'}</span>
            <span>HO FAME!</span>
          </button>

          <button onClick={() => handleSetCurrentView('weight')} className="flex items-center justify-center gap-6 w-full h-28 rounded-[2.5rem] bg-white dark:bg-white/5 border-2 border-[#dbe6db] dark:border-white/10 text-[#111811] dark:text-white font-black text-3xl active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-6xl">trending_up</span>
            <span>GRAFICI E PESO</span>
          </button>
        </div>

        {/* Hungry Advice Card */}
        {hungryAdvice && (
          <div className="px-4 mb-8">
            <div className="bg-gradient-to-br from-amber-400/20 to-amber-500/10 rounded-[2.5rem] p-8 border-4 border-amber-400/30 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-500">
              <button
                onClick={() => setHungryAdvice(null)}
                className="absolute top-4 right-4 text-amber-900 dark:text-amber-100 opacity-50 hover:opacity-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="flex items-center gap-4 mb-6 text-amber-600 dark:text-amber-400">
                <span className="material-symbols-outlined text-5xl">restaurant</span>
                <h3 className="font-black text-2xl uppercase tracking-widest italic">SPUNTINO CONSIGLIATO</h3>
              </div>
              <p className="text-4xl font-black italic text-amber-900 dark:text-amber-50 leading-tight mb-4">
                "{hungryAdvice.message}"
              </p>
              <div className="bg-white/40 dark:bg-black/40 rounded-3xl p-6 border-2 border-amber-400/20">
                <p className="text-3xl font-black text-amber-700 dark:text-amber-300 mb-2">{hungryAdvice.snack}</p>
                <p className="text-xl font-bold text-amber-800/70 dark:text-amber-200/70 italic">{hungryAdvice.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Coach Section */}
        {profile?.goalDescription && (
          <div className="px-4 py-2">
            <div className="bg-gradient-to-br from-[#13ec13]/10 to-[#13ec13]/5 rounded-[2rem] p-6 border border-[#13ec13]/20 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl">auto_awesome</span>
              </div>

              <div className="flex items-center gap-4 mb-8 text-primary">
                <span className="material-symbols-outlined text-5xl">psychology</span>
                <h3 className="font-black text-2xl uppercase tracking-[0.2em]">IL TUO AI COACH</h3>
              </div>

              {loadingCoach ? (
                <div className="flex items-center gap-6 py-10">
                  <div className="animate-spin size-12 border-8 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-4xl text-[#618961] italic font-black">STRIZZO IL CERVELLO...</p>
                </div>
              ) : coachAdvice ? (
                <div className="space-y-12">
                  <p className="text-4xl font-black leading-tight italic text-[#111811] dark:text-white">
                    "{coachAdvice.tip}"
                  </p>

                  <div className="pt-6">
                    <button
                      onClick={() => setShowRecipe(!showRecipe)}
                      className="flex items-center justify-center gap-4 w-full h-24 text-3xl font-black uppercase tracking-tighter text-primary bg-primary/20 rounded-[2.5rem] hover:bg-primary/30 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-5xl">{showRecipe ? 'expand_less' : 'restaurant'}</span>
                      {showRecipe ? 'NASCONDI RICETTA' : 'RICETTA SUGGERITA'}
                    </button>

                    {showRecipe && (
                      <div className="mt-12 bg-white/70 dark:bg-black/50 rounded-[3.5rem] p-12 border-4 border-[#13ec13]/30 animate-in fade-in slide-in-from-top-6 duration-700 shadow-2xl">
                        <h4 className="font-black text-5xl mb-6 capitalize text-primary font-black italic">{coachAdvice.recipe.name}</h4>
                        <p className="text-3xl text-[#111811] dark:text-white mb-10 leading-relaxed font-bold">{coachAdvice.recipe.content}</p>
                        <div className="flex items-start gap-6 text-2xl font-black text-primary bg-primary/10 p-10 rounded-[3rem] italic border-2 border-primary/20">
                          <span className="material-symbols-outlined text-5xl shrink-0">lightbulb</span>
                          <span>{coachAdvice.recipe.why}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-black text-[#618961] text-center">Configura il profilo per i consigli!</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity Section */}
        <div className="px-4 pb-12 mt-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[#111811] dark:text-white text-4xl font-black italic">I TUOI PASTI</h3>
            <button className="text-primary text-xl font-black uppercase underline decoration-4 underline-offset-8">Tutti</button>
          </div>
          <div className="space-y-6">
            {meals.length === 0 ? (
              <p className="text-center text-[#618961] py-12 text-2xl font-bold bg-white dark:bg-background-dark rounded-[2.5rem] border-4 border-[#dbe6db] dark:border-white/10">Nessun pasto oggi.</p>
            ) : (
              meals.map(meal => {
                let timer;
                const handleTouchStart = () => {
                  timer = setTimeout(() => {
                    setEditingMeal(meal);
                  }, 600);
                };
                const handleTouchEnd = () => {
                  clearTimeout(timer);
                };

                return (
                  <div
                    key={meal.id}
                    onDoubleClick={() => setEditingMeal(meal)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="flex items-center gap-6 bg-white dark:bg-background-dark p-8 rounded-[3rem] border-4 border-[#dbe6db] dark:border-white/20 shadow-lg active:scale-95 transition-transform"
                  >
                    <div className="size-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-5xl">restaurant</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-black text-[#111811] dark:text-white capitalize">{meal.name}</h4>
                      <p className="text-xl text-[#618961] mt-2 font-bold">{meal.quantity}g</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#111811] dark:text-white">{meal.calories} kcal</p>
                      <p className="text-lg text-[#618961] font-bold mt-1">{new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Navigation Bar (iOS Style) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t-8 border-[#13ec13]/20 px-8 py-8 pb-14 flex justify-between items-center z-20 shadow-[0_-20px_60px_rgba(0,0,0,0.15)]">
        <button onClick={() => handleSetCurrentView('dashboard')} className="flex flex-col items-center text-primary group">
          <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-3xl font-black mt-2 uppercase tracking-tighter">HOME</span>
        </button>
        <button onClick={() => handleSetCurrentView('weight')} className="flex flex-col items-center text-[#618961] group">
          <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">restaurant_menu</span>
          <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PESO</span>
        </button>
        <button className="flex flex-col items-center text-[#618961] group">
          <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">emoji_events</span>
          <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PREMI</span>
        </button>
        <button
          onClick={() => router.push('/profile')}
          className="flex flex-col items-center text-[#618961] group"
        >
          <span className="material-symbols-outlined text-8xl transition-all group-active:scale-95">account_circle</span>
          <span className="text-3xl font-black mt-2 uppercase tracking-tighter">PROFILO</span>
        </button>
      </div>
    </div>
  );
}
