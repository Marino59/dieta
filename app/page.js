'use client';

import React, { useState, useEffect, useRef, cloneElement, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, TrendingUp, TrendingDown, Monitor, Calendar, Clock, Plus, ChevronLeft, ChevronRight, Activity, Loader2, AlertTriangle, User } from 'lucide-react';
import { getMeals, deleteMeal, updateMeal, addMeal, getUserProfile, getWeights, addWeight, deleteWeight, subscribeToMeals } from '@/lib/firestore';
import { getDailyCoachAdvice, getHungryAdvice, parseWeightGoal } from "@/lib/ai";
import ConfirmMealModal from '@/components/ConfirmMealModal';
import ProductEvaluationModal from '@/components/ProductEvaluationModal';
import CameraInput from '@/components/CameraInput';
import MenuAdvisorModal from '@/components/MenuAdvisorModal';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Scatter
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const authContext = useAuth();
  const user = authContext?.user;
  const authLoading = authContext?.loading ?? true;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingMealData, setPendingMealData] = useState(null);
  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputMode, setInputMode] = useState(null);
  const [coachAdvice, setCoachAdvice] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [weights, setWeights] = useState([]);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [newWeightValue, setNewWeightValue] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightTime, setWeightTime] = useState(new Date().toTimeString().slice(0, 5));
  const [hungryAdvice, setHungryAdvice] = useState(null);
  const [loadingHungry, setLoadingHungry] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const [weightPeriod, setWeightPeriod] = useState('SETT');
  const chartContainerRef = useRef(null);
  const dateInputRef = useRef(null);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [weightViewReady, setWeightViewReady] = useState(false);
  const [showMenuAdvisor, setShowMenuAdvisor] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const handleResize = () => {
      if (currentView === 'weight' && chartContainerRef.current) {
        setChartWidth(chartContainerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [currentView, chartReady]);

  useEffect(() => {
    const view = searchParams.get('view');
    const action = searchParams.get('action');

    if (view === 'weight' && currentView !== 'weight') {
      setSwipeDirection(1);
      setCurrentView('weight');
    } else if (action === 'ho-fame' && currentView !== 'hungry') {
      setCurrentView('hungry');
    } else if (!view && !action && (currentView === 'weight' || currentView === 'hungry')) {
      if (currentView === 'weight') setSwipeDirection(-1);
      setCurrentView('dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let unsubscribeMeals = () => {};

    getUserProfile().then(p => {
      setProfile(p);
      if (!p) {
        // New user: no profile yet → send them to setup
        router.push('/profile');
        setLoading(false);
        return;
      }

      // Existing user: load weights and subscribe to meals
      getWeights().then(w => {
        setWeights(w);
        setChartReady(true);
      });

      unsubscribeMeals = subscribeToMeals(selectedDate, (updatedMeals) => {
        setMeals(updatedMeals);
        setLoading(false);
      });
    });

    return () => unsubscribeMeals();
  }, [user, selectedDate]);

  useEffect(() => {
    if (profile?.coachAdvice) {
      setCoachAdvice(profile.coachAdvice);
    }
  }, [profile]);

  const handleSetCurrentView = (view) => {
    setCurrentView(view);
    setInputMode(null);
  };

  const handleHoFame = async () => {
    if (!user || !profile) return;
    setLoadingHungry(true);
    setCurrentView('hungry');
    try {
      const advice = await getHungryAdvice(profile, meals);
      setHungryAdvice(advice);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHungry(false);
    }
  };

  const handleSaveNewMeal = async (mealData) => {
    setLoading(true);
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, mealData);
      } else {
        await addMeal(mealData);
      }
      setPendingMealData(null);
      setEditingMeal(null);
      setCurrentView('dashboard');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (id) => {
    if (confirm('Eliminare questo pasto?')) {
      await deleteMeal(id);
    }
  };

  const handleAddWeight = async () => {
    if (!user || !newWeightValue) {
      console.log("Add weight aborted: user or value missing", { user: !!user, value: newWeightValue });
      return;
    }
    console.log("Saving weight:", newWeightValue);
    setLoading(true);
    try {
      const sanitizedWeight = parseFloat(newWeightValue.toString().replace(',', '.'));
      console.log("Sanitized weight:", sanitizedWeight);
      const timestamp = new Date(`${weightDate}T${weightTime}`);
      await addWeight({ weight: sanitizedWeight, created_at: timestamp.toISOString() });
      const updatedWeights = await getWeights();
      setWeights(updatedWeights);

      // Refresh AI Coach Advice only on new weight
      setLoadingCoach(true);
      try {
        const advice = await getDailyCoachAdvice(profile, meals, updatedWeights);
        setCoachAdvice(advice);
        // Persist advice in profile
        const { saveUserProfile } = await import('@/lib/firestore');
        await saveUserProfile({ ...profile, coachAdvice: advice });
      } catch (err) {
        console.error("Coach refresh failed", err);
      } finally {
        setLoadingCoach(false);
      }

      setIsAddingWeight(false);
      setNewWeightValue("");
      console.log("Weight saved successfully");
    } catch (e) {
      console.error("Error saving weight:", e);
      alert("Errore nel salvataggio del peso. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeight = async (id) => {
    if (confirm('Eliminare questa pesata?')) {
      await deleteWeight(id);
      const updatedWeights = await getWeights(user.uid);
      setWeights(updatedWeights);
    }
  };

  const handleMealIdentified = (data) => {
    setPendingMealData(data);
    setCurrentView('confirm-meal');
  };

  const handleProductEvaluated = (data) => {
    setPendingMealData(data);
    setCurrentView('eval-product');
  };

  const handleSwipe = (direction) => {
    if (direction === 'left' && currentView === 'dashboard') {
      setSwipeDirection(1);
      router.push('/?view=weight');
    } else if (direction === 'right' && currentView === 'weight') {
      setSwipeDirection(-1);
      router.push('/');
    }
  };

  // Calculations - Memoized to prevent unnecessary re-renders
  const totalCalories = useMemo(() => meals.reduce((sum, m) => sum + (m.calories || 0), 0), [meals]);
  const totalProtein = useMemo(() => meals.reduce((sum, m) => sum + (m.protein || 0), 0), [meals]);
  const totalCarbs = useMemo(() => meals.reduce((sum, m) => sum + (m.carbs || 0), 0), [meals]);
  const totalFat = useMemo(() => meals.reduce((sum, m) => sum + (m.fat || 0), 0), [meals]);

  const targetCalories = profile?.targetCalories || 2400;
  const targetProtein = profile?.targetProtein || 150;
  const targetCarbs = profile?.targetCarbs || 300;
  const targetFat = profile?.targetFat || 70;
  const targetWeight = profile?.targetWeight || 0;

  const proteinPercentage = useMemo(() => Math.min((totalProtein / targetProtein) * 100, 100), [totalProtein, targetProtein]);
  const fatPercentage = useMemo(() => Math.min((totalFat / targetFat) * 100, 100), [totalFat, targetFat]);
  const carbsPercentage = useMemo(() => Math.min((totalCarbs / targetCarbs) * 100, 100), [totalCarbs, targetCarbs]);

  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const dashPercentage = useMemo(() => Math.min((totalCalories / targetCalories) * circumference, circumference), [totalCalories, targetCalories, circumference]);
  const strokeDashoffset = circumference - dashPercentage;

  // Weight Data Processing - Memoized to prevent infinite loop with Recharts
  const getWeightTime = (w) => w.created_at ? new Date(w.created_at).getTime() : w.timestamp;
  
  const sortedWeights = useMemo(() => {
    return [...weights].sort((a, b) => getWeightTime(a) - getWeightTime(b));
  }, [weights]);

  const currentWeight = useMemo(() => sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weight : 0, [sortedWeights]);
  const initialWeight = useMemo(() => sortedWeights.length > 0 ? sortedWeights[0].weight : 0, [sortedWeights]);
  
  const weeklyDelta = useMemo(() => {
    if (sortedWeights.length < 2) return 0;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weightsThisWeek = sortedWeights.filter(w => getWeightTime(w) >= oneWeekAgo);
    if (weightsThisWeek.length < 2) return 0;
    return (weightsThisWeek[weightsThisWeek.length - 1].weight - weightsThisWeek[0].weight).toFixed(1);
  }, [sortedWeights]);

  const chartData = useMemo(() => {
    if (!isMounted) return [];
    
    const now = new Date();
    let startDate = new Date();
    if (weightPeriod === 'SETT') {
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    const filtered = sortedWeights.filter(w => new Date(getWeightTime(w)) >= startDate);
    
    return filtered.map(w => ({
      day: new Date(getWeightTime(w)).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      weight: parseFloat(w.weight),
      fullDate: new Date(getWeightTime(w)).toLocaleDateString('it-IT')
    }));
  }, [sortedWeights, weightPeriod, isMounted]);

  const maxWeight = Math.max(...chartData.map(d => d.weight), targetWeight) || 100;

  const pageVariants = {
    initial: (direction) => ({
      x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 200, damping: 25 },
        opacity: { duration: 0.3 }
      }
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : direction > 0 ? '-100%' : 0,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 200, damping: 25 },
        opacity: { duration: 0.3 }
      }
    })
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Modals (outside AnimatePresence for simplicity)
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

  if (currentView === 'eval-product' && pendingMealData) {
    return (
      <ProductEvaluationModal
        productData={pendingMealData}
        onClose={() => {
          setPendingMealData(null);
          handleSetCurrentView('add-meal');
        }}
        onConfirm={handleSaveNewMeal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#050a05] font-sans pb-12 transition-colors duration-500 overflow-x-hidden">
      <AnimatePresence mode="wait" custom={swipeDirection}>
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            custom={swipeDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset }) => {
              if (offset.x < -50) handleSwipe('left');
            }}
            className="w-full flex flex-col"
          >
            <div className="w-full max-w-none mx-auto">
              <div className="sticky top-1 z-20 bg-background-light/80 dark:bg-[#050a05]/80 backdrop-blur-xl border-b border-primary/10 px-6 py-6 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="size-32 rounded-[2rem] bg-primary/20 flex items-center justify-center border-4 border-primary/30 overflow-hidden shadow-2xl shadow-primary/20 active:scale-95 transition-transform" onClick={() => router.push('/profile')}>
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: user?.photoURL ? `url("${user.photoURL}")` : `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFAmglX_uCu_WV-qOLzoOA-CE_0bUcHzS1_PfOGohbq1vTiE0UrReWotFOAHEkz7FuVQwWJj1YvWUPZTywZaUe87zzgy4JFmR334tzQv7wsF6WTJd_AqR5-SKgjSK2u9ySnFoxPFkP30UMBB4MpHzE6QIeZ9-9ZAxV2AWmwQ_IFtcEY8rKNFB_9_H0QKu4rxqax1AqfAgpKdPy74cfTk7n-s-A27LL0c4_3SdORyyFUXTDwqCelSV3dO1pTwmNSnvxc7TMRYUA1A")`
                      }}
                    ></div>
                  </div>
                  <h1 className="text-[#111811] dark:text-white text-9xl font-black leading-tight tracking-tighter flex-1 text-center italic drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">DIETA</h1>
                  <div className="flex w-32 items-center justify-end relative shrink-0">
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="absolute inset-0 opacity-0 pointer-events-none w-1 h-1"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          const now = new Date();
                          if (newDate.toDateString() === now.toDateString()) {
                            newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                          }
                          setSelectedDate(newDate);
                          setCoachAdvice(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => dateInputRef.current?.showPicker()}
                      className="flex cursor-pointer items-center justify-center transition-transform active:scale-95 text-[#0a150a] dark:text-white hover:text-primary bg-transparent size-32"
                    >
                      <span className="material-symbols-outlined drop-shadow-md" style={{ fontSize: '100px' }}>calendar_month</span>
                    </button>
                  </div>
                </div>

                <div className="mt-8 px-8 py-8 bg-[#0a150a] dark:bg-primary/20 flex items-center justify-between gap-6 rounded-[2.5rem] border-4 border-primary/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-6 text-white">
                    <span className="material-symbols-outlined text-8xl drop-shadow-[0_0_20px_rgba(19,236,19,0.8)]">event</span>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic drop-shadow-md">
                      {selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                      {selectedDate.toDateString() === new Date().toDateString() && " (OGGI)"}
                    </h2>
                  </div>
                  {selectedDate.toDateString() !== new Date().toDateString() && (
                    <button onClick={() => setSelectedDate(new Date())} className="bg-primary text-[#050a05] px-10 py-8 rounded-3xl font-black text-4xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all">OGGI</button>
                  )}
                </div>
              </div>

              <main className="w-full pb-16">
                <div className="p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-background-dark/60 backdrop-blur-3xl rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-4 border-white/20 dark:border-white/5 flex flex-col items-center relative overflow-hidden"
                  >
                    <div className="absolute top-1 left-1 w-full h-3 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <div className="relative flex items-center justify-center p-8 mb-4">
                      <svg viewBox="0 0 480 480" className="w-[90vw] max-w-[28rem] aspect-square progress-ring drop-shadow-[0_0_60px_rgba(19,236,19,0.4)]">
                        <circle className="text-[#dbe6db] dark:text-white/5" cx="240" cy="240" fill="transparent" r="180" stroke="currentColor" strokeWidth="36" />
                        <motion.circle
                          initial={{ strokeDashoffset: 1131 }}
                          animate={{ strokeDashoffset: 1131 - (1131 * Math.min(totalCalories / targetCalories, 1)) }}
                          transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
                          className="text-primary transition-all"
                          cx="240" cy="240" fill="transparent" r="180" stroke="currentColor" strokeDasharray="1131" strokeLinecap="round" strokeWidth="36"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-9xl font-black text-[#111811] dark:text-white leading-none tracking-tighter drop-shadow-2xl">{totalCalories.toLocaleString()}</span>
                        <span className="text-3xl text-primary font-black uppercase tracking-[0.5em] mt-4 italic">KCAL</span>
                        <div className="my-5 h-2 w-20 bg-primary/20 rounded-full"></div>
                        <span className="text-2xl text-[#618961] font-black italic opacity-60 uppercase tracking-widest text-center">Target {targetCalories.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-center pt-10 border-t-4 border-[#dbe6db]/50 dark:border-white/10 w-full">
                      <p className="text-6xl font-black text-[#618961] uppercase italic">Rimanenti: <span className="text-[#111811] dark:text-primary drop-shadow-[0_0_20px_rgba(19,236,19,0.5)]">{Math.max(0, targetCalories - totalCalories).toLocaleString()}</span></p>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-6 px-6 py-5">
                  {/* Protein */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="bg-white dark:bg-background-dark/60 backdrop-blur-xl rounded-2xl p-5 border-2 border-blue-100 dark:border-blue-500/20 flex flex-col items-center text-center shadow-[0_0_50px_rgba(59,130,246,0.15)] transition-all hover:shadow-[0_0_70px_rgba(59,130,246,0.3)] group"
                  >
                    <span className="material-symbols-outlined text-blue-500 mb-4 text-8xl drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] group-hover:scale-110 transition-transform">restaurant_menu</span>
                    <p className="text-2xl font-black text-blue-900 dark:text-blue-100 uppercase italic">PROT</p>
                    <div className="w-full bg-blue-50 dark:bg-blue-950/40 h-5 rounded-full mt-6 overflow-hidden border border-blue-500/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${proteinPercentage}%` }} transition={{ duration: 1.5 }} className="bg-blue-500 h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    </div>
                    <p className="text-5xl text-blue-600 dark:text-blue-400 mt-6 font-black italic">{Math.round(totalProtein)}g</p>
                    <p className="text-lg text-blue-500/40 font-bold uppercase mt-1">Goal {targetProtein}g</p>
                  </motion.div>

                  {/* Fats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="bg-white dark:bg-background-dark/60 backdrop-blur-xl rounded-2xl p-5 border-2 border-amber-100 dark:border-amber-500/20 flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.15)] transition-all hover:shadow-[0_0_70px_rgba(245,158,11,0.3)] group"
                  >
                    <span className="material-symbols-outlined text-amber-500 mb-4 text-8xl drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform">opacity</span>
                    <p className="text-2xl font-black text-amber-900 dark:text-amber-100 uppercase italic">GRASSI</p>
                    <div className="w-full bg-amber-50 dark:bg-amber-950/40 h-5 rounded-full mt-6 overflow-hidden border border-amber-500/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${fatPercentage}%` }} transition={{ duration: 1.5 }} className="bg-amber-500 h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                    </div>
                    <p className="text-5xl text-amber-600 dark:text-amber-400 mt-6 font-black italic">{Math.round(totalFat)}g</p>
                    <p className="text-lg text-amber-500/40 font-bold uppercase mt-1">Goal {targetFat}g</p>
                  </motion.div>

                  {/* Carbs */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="bg-white dark:bg-background-dark/60 backdrop-blur-xl rounded-2xl p-5 border-2 border-emerald-100 dark:border-emerald-500/20 flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] transition-all hover:shadow-[0_0_70px_rgba(16,185,129,0.3)] group"
                  >
                    <span className="material-symbols-outlined text-emerald-500 mb-4 text-8xl drop-shadow-[0_0_20px_rgba(16,185,129,0.6)] group-hover:scale-110 transition-transform">bakery_dining</span>
                    <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 uppercase italic">CARBO</p>
                    <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 h-5 rounded-full mt-6 overflow-hidden border border-emerald-500/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${carbsPercentage}%` }} transition={{ duration: 1.5 }} className="bg-emerald-500 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                    </div>
                    <p className="text-5xl text-emerald-600 dark:text-emerald-400 mt-6 font-black italic">{Math.round(totalCarbs)}g</p>
                    <p className="text-lg text-emerald-500/40 font-bold uppercase mt-1">Goal {targetCarbs}g</p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-4 px-6 py-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleSetCurrentView('add-meal')}
                    className="flex flex-col items-center justify-center w-full h-32 sm:h-40 rounded-3xl bg-gradient-to-br from-primary to-[#0ed10e] text-[#050a05] shadow-[0_30px_70px_rgba(19,236,19,0.3)] border-8 border-white/20 relative overflow-hidden group"
                  >
                    <span className="font-black text-3xl sm:text-4xl tracking-tight italic uppercase text-center w-full px-1 flex-1 flex items-center justify-center">AGGIUNGI</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleHoFame}
                    className="flex flex-col items-center justify-center w-full h-32 sm:h-40 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_30px_70px_rgba(245,158,11,0.3)] border-8 border-white/20 relative overflow-hidden group"
                  >
                    <span className="font-black text-3xl sm:text-4xl tracking-tight italic uppercase text-center w-full px-1 flex-1 flex items-center justify-center">HO FAME</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMenuAdvisor(true)}
                    className="flex flex-col items-center justify-center w-full h-32 sm:h-40 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-[0_30px_70px_rgba(16,185,129,0.3)] border-8 border-white/20 relative overflow-hidden group"
                  >
                    <span className="text-4xl mb-1">🍽️</span>
                    <span className="font-black text-2xl sm:text-3xl tracking-tight italic uppercase text-center w-full px-1">MENU</span>
                  </motion.button>
                </div>

                {hungryAdvice && (
                  <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="px-6 mb-6">
                    <div className="bg-gradient-to-br from-amber-400/30 to-amber-500/10 rounded-3xl p-6 border-4 border-amber-400/40 shadow-3xl relative overflow-hidden">
                      <div className="absolute top-1 right-1 p-6 opacity-5"><span className="material-symbols-outlined text-7xl">restaurant_menu</span></div>
                      <button onClick={() => setHungryAdvice(null)} className="absolute top-5 right-5 size-6 bg-white/10 rounded-full flex items-center justify-center text-amber-900 dark:text-white/60 active:scale-90"><span className="material-symbols-outlined text-4xl">close</span></button>
                      <div className="flex items-center gap-4 mb-5 text-amber-500"><span className="material-symbols-outlined text-7xl">restaurant</span><h3 className="font-black text-3xl uppercase italic tracking-widest">CONSIGLIO FAME</h3></div>
                      <p className="text-5xl font-black italic text-amber-950 dark:text-white leading-tight mb-5">"{hungryAdvice.message}"</p>
                      <div className="bg-white/50 dark:bg-black/40 backdrop-blur-md rounded-2xl p-6 border-2 border-amber-400/30 shadow-inner">
                        <p className="text-6xl font-black text-amber-700 dark:text-amber-400 mb-4 italic tracking-tight">{hungryAdvice.snack}</p>
                        <p className="text-3xl font-bold dark:text-white/70 italic leading-relaxed">{hungryAdvice.reason}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile?.goalDescription && (
                  <div className="px-6 py-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-background-dark/40 backdrop-blur-2xl rounded-3xl p-6 border-2 border-primary/20 shadow-2xl relative overflow-hidden">
                      <div className="absolute -bottom-10 -right-10 opacity-5"><span className="material-symbols-outlined text-7xl text-primary">auto_awesome</span></div>
                      <div className="flex items-center gap-6 mb-6 text-primary"><span className="material-symbols-outlined text-7xl">psychology</span><h3 className="font-black text-3xl tracking-[0.3em] italic">AI COACH</h3></div>
                      {loadingCoach ? (
                        <div className="flex items-center gap-5 py-6"><div className="animate-spin size-8 border-8 border-primary border-t-transparent rounded-full" /><p className="text-4xl text-primary italic font-black animate-pulse">ANALIZZO I DATI...</p></div>
                      ) : coachAdvice ? (
                        <p className="text-5xl font-black italic text-[#111811] dark:text-white leading-snug tracking-tight uppercase">"{coachAdvice.tip}"</p>
                      ) : null}
                    </motion.div>
                  </div>
                )}

                <div className="px-6 pb-6 mt-6">
                  <div className="flex justify-between items-end mb-6 px-2"><h3 className="text-[#111811] dark:text-white text-5xl font-black italic uppercase tracking-tighter">I Tuoi Pasti</h3><button className="text-primary text-2xl font-black uppercase underline decoration-[6px] underline-offset-[12px] active:scale-95 transition-transform">Tutti i pasti</button></div>
                  <div className="space-y-8">
                    {meals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-background-dark/30 rounded-3xl border-4 border-dashed border-[#dbe6db] dark:border-white/10 opacity-60"><span className="material-symbols-outlined text-5xl mb-6 text-[#618961]">flatware</span><p className="text-4xl font-black text-[#618961] italic">Nessun pasto registrato oggi.</p></div>
                    ) : (
                      meals.map((meal, idx) => (
                        <motion.div
                          key={meal.id}
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onDoubleClick={() => setEditingMeal(meal)}
                          className={`flex items-center gap-5 p-6 rounded-2xl border-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] active:scale-95 transition-all relative overflow-hidden group ${meal.status === 'pending' ? 'bg-primary/5 border-primary/20 cursor-wait' : meal.status === 'error' ? 'bg-red-50 dark:bg-red-950/20 border-red-500/20' : 'bg-white dark:bg-background-dark/60 backdrop-blur-2xl border-white/40 dark:border-white/5'}`}
                        >
                          <div className={`size-28 rounded-xl flex items-center justify-center shadow-lg ${meal.status === 'error' ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'}`}>
                            {meal.status === 'pending' ? <Loader2 className="animate-spin size-8" /> : meal.status === 'error' ? <AlertTriangle className="size-8" /> : <span className="material-symbols-outlined text-4xl">restaurant</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-5xl font-black italic uppercase tracking-tighter truncate leading-tight">{meal.name}</h4>
                            <div className="flex items-center gap-4 mt-2"><span className="text-3xl font-bold opacity-40 italic">{meal.quantity}g</span><div className="size-2 rounded-full bg-primary/30" /><span className="text-3xl font-black text-primary italic uppercase tracking-widest">{meal.calories} KCAL</span></div>
                          </div>
                          <div className="flex flex-col items-end gap-4">
                            <div className="text-2xl text-white/30 font-black italic bg-black/20 px-4 py-2 rounded-full">{new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id); }} className="size-10 rounded-3xl bg-red-500/10 text-red-500 flex shrink-0 items-center justify-center active:scale-90 opacity-0 group-hover:opacity-100 transition-all shadow-lg border-2 border-red-500/10"><Trash2 size={40} /></button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </main>
            </div>
          </motion.div>
        )}

        {currentView === 'weight' && (
          <motion.div
            key="weight"
            custom={swipeDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset }) => {
              if (offset.x > 50) handleSwipe('right');
            }}
            onAnimationComplete={() => setWeightViewReady(true)}
            onAnimationStart={(def) => { if (def === 'exit') setWeightViewReady(false); }}
            className="w-full flex flex-col"
          >
            <div className="w-full">
              <header className="flex items-center justify-between px-5 py-6 sticky top-1 bg-[#050a05]/80 backdrop-blur-3xl z-30 border-b border-white/5">
                <button onClick={() => handleSwipe('right')} className="size-10 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 border-2 border-white/10 shadow-inner group"><ChevronLeft size={48} className="text-primary group-hover:-translate-x-1 transition-transform" /></button>
                <h1 className="text-5xl font-black italic uppercase tracking-tighter text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">PESO</h1>
                <div className="size-10" />
              </header>

              <main className="flex-1 px-5 space-y-10 py-6">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#241d12] to-[#0a0f0a] backdrop-blur-3xl border border-amber-500/30 rounded-[3rem] p-8 shadow-[0_20px_60px_rgba(245,158,11,0.15)] relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 opacity-10 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-125"><TrendingUp size={150} className="text-amber-500" /></div>
                  
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="text-center p-6 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-amber-500/80 text-xl font-black uppercase tracking-[0.3em] mb-2 italic">Iniziale</p>
                      <div className="flex items-baseline justify-center gap-1 font-black italic">
                        <span className="text-4xl text-white tracking-tighter">{isMounted ? (initialWeight || "--.-") : "--.-"}</span>
                        <span className="text-sm text-white/40 uppercase">kg</span>
                      </div>
                    </div>
                    <div className="text-center p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                      <p className="text-amber-500 text-xl font-black uppercase tracking-[0.3em] mb-2 italic">Persi</p>
                      <div className="flex items-baseline justify-center gap-1 font-black italic">
                        <span className="text-4xl text-amber-500 tracking-tighter">{(initialWeight - currentWeight).toFixed(1)}</span>
                        <span className="text-sm text-amber-500/60 uppercase">kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-6">
                    <div className="text-center">
                      <p className="text-amber-500/80 text-xl font-black uppercase tracking-[0.4em] mb-4 italic text-amber-500/60">Peso Attuale</p>
                      <div className="flex items-baseline justify-center gap-2 font-black italic">
                        <span className="text-7xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] tracking-tighter">{isMounted ? (currentWeight || "--.-") : "--.-"}</span>
                        <span className="text-5xl text-primary/70 uppercase">kg</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-px bg-white/10" />
                    
                    <div className="text-center">
                      <p className="text-white/40 text-xl font-black uppercase tracking-[0.3em] mb-4 italic text-amber-500/60">Obiettivo Target</p>
                      <div className="flex items-center justify-center gap-4">
                        <input
                          type="number"
                          step="0.1"
                          value={targetWeight || ""}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value);
                            const { saveUserProfile } = await import('@/lib/firestore');
                            await saveUserProfile({ ...profile, targetWeight: val });
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-4xl font-black text-amber-500 w-48 text-center outline-none focus:border-amber-500/50"
                          placeholder="--"
                        />
                        <span className="text-2xl text-white/20 font-bold uppercase italic">kg</span>
                      </div>
                    </div>
                  </div>

                  <div className={cn("mt-8 w-full flex items-center justify-center gap-4 px-6 py-8 rounded-2xl text-xl font-black italic uppercase tracking-wider backdrop-blur-lg shadow-inner transition-all", weeklyDelta <= 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-red-500/10 text-red-500 border border-red-500/20")}>
                    {weeklyDelta < 0 ? (
                      <TrendingDown className="size-8" />
                    ) : (
                      <TrendingUp className={cn("size-8", weeklyDelta === 0 && "opacity-50")} />
                    )}
                    <span>{weeklyDelta > 0 ? "+" : ""}{weeklyDelta} KG QUESTA SETTIMANA</span>
                  </div>
                </motion.div>

                <div className="bg-[#121c12] rounded-[3rem] p-4 flex flex-col gap-6 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      console.log("NUOVA PESATA CLICKED");
                      setIsAddingWeight(true);
                    }}
                    className="bg-primary hover:bg-[#1eb054] text-[#050a05] font-black w-full py-10 rounded-2xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(19,236,19,0.3)] text-4xl uppercase italic tracking-tighter flex items-center justify-center gap-6 relative z-50 pointer-events-auto"
                  >
                    <Plus size={48} strokeWidth={4} /> NUOVA PESATA
                  </button>
                </div>


                <section className="space-y-12">
                  <div className="flex flex-col gap-6 mb-10 px-6">

                    <div className="flex bg-slate-200/50 dark:bg-white/5 p-2 rounded-2xl border border-slate-300/50 dark:border-white/5">
                      {['SETTIMANA', 'ANNO'].map((period) => (
                        <button key={period} onClick={() => setWeightPeriod(period.substring(0, 4).toUpperCase())} className={cn("flex-1 py-6 text-4xl font-black rounded-xl transition-all uppercase tracking-tighter", weightPeriod === period.substring(0, 4).toUpperCase() ? "bg-amber-500 text-[#050a05] shadow-md" : "text-slate-500 dark:text-white/30 hover:text-slate-800 dark:hover:text-white/60")}>
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#0a150a] border border-white/5 rounded-3xl p-4 relative shadow-2xl overflow-hidden">
                    {isMounted && weightViewReady && chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 900 }}
                            minTickGap={10}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#0a150a] border border-white/10 p-2 rounded-xl shadow-xl">
                                    <p className="text-primary font-black text-xl italic">{payload[0].value} kg</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#f59e0b"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorWeight)"
                            isAnimationActive={false}
                            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white/20 italic gap-2">
                        <Activity size={32} className="opacity-20 animate-pulse" />
                        <span className="text-sm">Nessun dato nel periodo selezionato</span>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-10 pb-6">
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter px-4 text-[#111811] dark:text-white">Cronologia Pesate</h2>
                  <div className="space-y-6">
                    {sortedWeights.length === 0 ? (
                      <div className="text-center py-10 bg-white/5 rounded-3xl border-4 border-dashed border-white/10 italic font-bold text-white/30 text-3xl">Nessun dato registrato.</div>
                    ) : (
                      [...sortedWeights].reverse().map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-[#121c12]/80 backdrop-blur-2xl border-2 border-white/5 rounded-2xl p-6 flex items-center justify-between group active:scale-98 transition-all shadow-xl"
                        >
                          <div className="flex items-center gap-10">
                            <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Calendar size={48} className="text-primary" /></div>
                            <div>
                              <h4 className="text-4xl font-black text-[#111811] dark:text-white italic uppercase tracking-tight">{new Date(getWeightTime(item)).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</h4>
                              <p className="text-slate-500 dark:text-white/40 text-2xl font-bold mt-2 italic">{new Date(getWeightTime(item)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-10">
                            <span className="text-5xl font-black text-primary italic drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">{item.weight}<span className="text-2xl ml-2 not-italic font-bold text-slate-400 dark:text-white/20">kg</span></span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteWeight(item.id); }} className="size-10 bg-red-500/10 text-red-500 rounded-3xl active:scale-75 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center border-2 border-red-500/10"><Trash2 size={40} /></button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>
              </main>
            </div>
          </motion.div>
        )}

        {currentView === 'hungry' && (
          <motion.div
            key="hungry"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full min-h-screen bg-[#0a0f0a] flex flex-col"
          >
            <header className="flex items-center justify-between px-6 py-6 sticky top-1 bg-[#0a0f0a]/90 backdrop-blur-2xl z-30 border-b border-white/5">
              <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-6 text-primary font-black text-3xl bg-primary/10 px-6 py-6 rounded-2xl active:scale-90 transition-transform"><ChevronLeft size={50} /> DASHBOARD</button>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(19,236,19,0.3)]">HO FAME</h1>
              <div className="w-10" />
            </header>
            <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
              {!hungryAdvice && loadingHungry ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6"><div className="animate-spin size-24 border-[8px] border-primary border-t-transparent rounded-full shadow-[0_0_50px_rgba(19,236,19,0.4)]"></div><p className="text-2xl text-primary italic font-black animate-pulse tracking-tighter">AI STA CUCINANDO...</p></div>
              ) : hungryAdvice ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#121c12]/80 backdrop-blur-3xl rounded-3xl p-8 border-4 border-amber-400 shadow-[0_30px_60px_rgba(245,158,11,0.2)] relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 opacity-5 rotate-12"><span className="material-symbols-outlined text-[10rem]">restaurant</span></div>
                  <div className="flex items-center gap-4 mb-6 text-amber-500"><span className="material-symbols-outlined text-5xl">restaurant</span><div><h3 className="font-black text-2xl uppercase tracking-tighter leading-none mb-1">CONSIGLIO</h3><p className="text-sm font-bold opacity-70 italic tracking-widest">DI ALTA CUCINA AI</p></div></div>
                  <div className="space-y-8">
                    <p className="text-3xl font-black italic text-white leading-tight tracking-tighter">"{hungryAdvice.message}"</p>
                    <div className="bg-amber-400/10 rounded-2xl p-6 border-2 border-amber-400/20 shadow-inner">
                      <p className="text-sm font-black text-amber-500 uppercase tracking-[0.4em] mb-4 text-center">SPUNTINO PERFETTO</p>
                      <p className="text-4xl font-black text-amber-400 mb-6 text-center leading-none italic drop-shadow-md">{hungryAdvice.snack}</p>
                      <div className="h-1 w-16 bg-amber-400/30 mx-auto mb-6 rounded-full"></div>
                      <p className="text-xl font-bold text-white/80 italic text-center leading-relaxed tracking-tight">{hungryAdvice.reason}</p>
                    </div>
                    <button onClick={() => handleHoFame()} className="w-full py-5 rounded-2xl bg-amber-500 text-[#050a05] font-black text-2xl shadow-[0_20px_40px_rgba(245,158,11,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic border-2 border-white/20"><span className="material-symbols-outlined text-3xl">refresh</span>Cambia snack</button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12"><button onClick={() => handleHoFame()} className="w-full h-64 rounded-3xl bg-amber-500 text-[#050a05] font-black text-5xl shadow-[0_30px_70px_rgba(245,158,11,0.3)] active:scale-95 transition-all border-8 border-white/20 flex flex-col items-center justify-center gap-6 group"><span className="material-symbols-outlined text-[8rem] group-hover:scale-110 transition-transform duration-300">emoji_food_beverage</span>DIMMELO TU!</button></div>
              )}
            </main>
          </motion.div>
        )}

        {currentView === 'add-meal' && (
          <motion.div
            key="add-meal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-0 z-[60] bg-background-light dark:bg-[#050a05] px-0 sm:px-6 pt-16 min-h-screen overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto pb-4">
              <div className="flex items-center justify-between mb-4 px-4">
                <button onClick={() => handleSetCurrentView('dashboard')} className="flex items-center gap-4 text-2xl font-black bg-primary/10 px-6 py-5 rounded-2xl active:scale-90 transition-transform"><ChevronLeft size={44} strokeWidth={4} /> INDIETRO</button>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-primary/40 uppercase tracking-[0.3em] mb-1 italic">NUOVO INSERIMENTO (v1.2)</span>
                  <span className="text-3xl font-black italic uppercase tracking-tighter">AGGIUNGI PASTO</span>
                </div>
              </div>
              <div className="bg-white dark:bg-background-dark/40 backdrop-blur-3xl rounded-3xl border-4 border-white/10 shadow-[0_50px_150px_rgba(0,0,0,0.4)] overflow-hidden">
                <CameraInput onMealAdded={() => handleSetCurrentView('dashboard')} onMealIdentified={handleMealIdentified} onProductEvaluated={handleProductEvaluated} defaultDate={selectedDate} initialMode={inputMode} profile={profile} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Modals/Overlays */}
      {
        isAddingWeight && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-[#050a05]/98 backdrop-blur-[50px] animate-in fade-in duration-500">
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-2xl bg-[#0a150a] border-[6px] border-primary/30 rounded-3xl p-10 shadow-[0_0_150px_rgba(19,236,19,0.2)]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">NUOVA PESATA</h2>
                <button onClick={() => setIsAddingWeight(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-90 border-2 border-white/10"><Plus className="rotate-45 size-8" /></button>
              </div>
              <div className="space-y-16">
                <div className="relative group">
                  <input type="number" inputMode="decimal" step="0.1" autoFocus value={newWeightValue} onChange={(e) => setNewWeightValue(e.target.value)} placeholder="00.0" className="w-full text-7xl font-black bg-transparent text-center border-b-[12px] border-primary/20 focus:border-primary outline-none py-6 text-white transition-all placeholder:text-white/5 italic tracking-tighter" />
                  <span className="absolute bottom-10 right-1 text-5xl font-black text-primary italic uppercase tracking-tighter opacity-50">KG</span>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="bg-white/5 p-8 rounded-[2.5rem] flex flex-col items-center gap-6 border-4 border-white/5 shadow-inner">
                    <span className="text-xl font-black text-white/40 tracking-[0.3em] text-center uppercase italic">GIORNO</span>
                    <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} className="bg-transparent text-5xl font-black outline-none text-center w-full text-white" />
                  </div>
                  <div className="bg-white/5 p-8 rounded-[2.5rem] flex flex-col items-center gap-6 border-4 border-white/5 shadow-inner">
                    <span className="text-xl font-black text-white/40 tracking-[0.3em] text-center uppercase italic">ORA</span>
                    <input type="time" value={weightTime} onChange={(e) => setWeightTime(e.target.value)} className="bg-transparent text-5xl font-black outline-none text-center w-full text-white" />
                  </div>
                </div>
                <button onClick={handleAddWeight} disabled={!newWeightValue || loading} className="w-full h-32 rounded-3xl bg-gradient-to-r from-primary to-[#0ed10e] text-[#050a05] shadow-[0_30px_70px_rgba(19,236,19,0.4)] active:scale-95 transition-all flex items-center justify-center gap-6 disabled:opacity-30 uppercase italic border-8 border-white/20 font-black text-4xl">
                  {loading ? <Activity className="animate-spin size-12" /> : <Plus size={48} strokeWidth={4} />} SALVA PESO
                </button>
              </div>
            </motion.div>
          </div>
        )
      }

      {/* Menu Advisor Modal */}
      <AnimatePresence>
        {showMenuAdvisor && (
          <MenuAdvisorModal
            onClose={() => setShowMenuAdvisor(false)}
            profile={profile}
            caloriesConsumed={totalCalories}
          />
        )}
      </AnimatePresence>
    </div >
  );
}
