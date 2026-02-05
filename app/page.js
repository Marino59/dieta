'use client';

import { useState, useEffect } from 'react';
import CameraInput from '@/components/CameraInput';
import NutritionCard from '@/components/NutritionCard';
import { UtensilsCrossed, Flame, LogOut, User, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getMeals, deleteMeal, updateMeal } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import ConfirmMealModal from '@/components/ConfirmMealModal';

export default function Home() {
  const authContext = useAuth();
  const user = authContext?.user;
  const authLoading = authContext?.loading ?? true;
  const logOut = authContext?.logOut;
  const router = useRouter();

  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load meals and profile
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mealsData, profileData] = await Promise.all([
        getMeals(selectedDate),
        import('@/lib/firestore').then(m => m.getUserProfile())
      ]);
      setMeals(mealsData);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);

    // Don't allow going into the future
    if (newDate > new Date()) return;

    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Oggi';

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Ieri';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const handleDeleteMeal = async (meal) => {
    if (!confirm('Sei sicuro di voler eliminare questo pasto?')) return;
    try {
      await deleteMeal(meal.id);
      setMeals(prev => prev.filter(m => m.id !== meal.id));
    } catch (error) {
      alert('Errore eliminazione: ' + error.message);
    }
  };

  const handleEditMeal = (meal) => {
    const mealForEditing = {
      ...meal,
      date: meal.created_at || meal.date || new Date(),
    };

    setEditingMeal(mealForEditing);
  };

  const handleUpdateConfirm = async (updatedData) => {
    try {
      const oldQuantity = editingMeal.quantity || 100;
      const newQuantity = updatedData.quantity;
      const ratio = newQuantity / oldQuantity;

      const updates = {
        quantity: newQuantity,
        analysis: updatedData.analysis,
        calories: Math.round(editingMeal.calories * ratio),
        protein: Math.round(editingMeal.protein * ratio),
        carbs: Math.round(editingMeal.carbs * ratio),
        fat: Math.round(editingMeal.fat * ratio),
      };

      // If date was changed in the modal, update created_at
      if (updatedData.date) {
        updates.created_at = updatedData.date;
      }

      await updateMeal(editingMeal.id, updates);

      setMeals(prev => prev.map(m =>
        m.id === editingMeal.id ? { ...m, ...updates } : m
      ));
      setEditingMeal(null);

      // Refresh data to ensure consistency
      fetchData();
    } catch (error) {
      alert('Errore aggiornamento: ' + error.message);
    }
  };

  const handleMealAdded = (newMeal) => {
    const mealDate = new Date(newMeal.created_at || Date.now());
    if (mealDate.toDateString() === selectedDate.toDateString()) {
      setMeals((prev) => [newMeal, ...prev]);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const targetCalories = profile?.targetCalories || 2000;
  const targetProtein = profile?.weight ? profile.weight * 2 : 150;
  const targetCarbs = profile?.targetCalories ? Math.round((profile.targetCalories * 0.45) / 4) : 250;
  const targetFat = profile?.targetCalories ? Math.round((profile.targetCalories * 0.25) / 9) : 65;

  const caloriePercentage = Math.min(Math.round((totalCalories / targetCalories) * 100), 100);

  return (
    <div className="min-h-screen pb-32 px-4 pt-8 safe-area-inset-bottom">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">I Tuoi <span className="gradient-text">Macro</span></h1>
          <p className="text-gray-400 text-base">Diario Alimentare</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="h-12 w-12 bg-slate-700/80 border border-slate-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 hover:border-blue-500 transition"
            title="Profilo"
          >
            <User size={24} />
          </button>
          <button
            onClick={logOut}
            className="h-12 w-12 bg-slate-700/80 border border-slate-600 rounded-full flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition"
            title="Logout"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>

      <CameraInput
        onMealAdded={handleMealAdded}
        hideButtons={!!editingMeal}
        defaultDate={selectedDate}
      />

      <div className="flex items-center justify-between mb-6 bg-slate-800/40 rounded-2xl p-2 border border-slate-700/50">
        <button
          onClick={() => changeDate(-1)}
          className="p-3 hover:bg-slate-700 rounded-xl transition text-gray-400 hover:text-white"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex items-center gap-2 relative">
          <CalendarIcon size={18} className="text-blue-400" />
          <span className="text-lg font-bold text-white min-w-[100px] text-center">
            {formatDate(selectedDate)}
          </span>
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (date > new Date()) return;
              setSelectedDate(date);
            }}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className={`p-3 rounded-xl transition ${isToday ? 'opacity-20 pointer-events-none' : 'hover:bg-slate-700 text-gray-400 hover:text-white'}`}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden', marginBottom: '32px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Flame size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Calorie Totali</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-white tabular-nums">{totalCalories}</span>
              <span className="text-gray-500 text-xl font-medium">/ {targetCalories}</span>
            </div>

            <div style={{ width: '100%', height: '12px', backgroundColor: '#1e293b', borderRadius: '999px', marginTop: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000"
                style={{ width: `${caloriePercentage}%` }}
              ></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <SummaryItem label="Proteine" value={totalProtein} target={targetProtein} color="#60a5fa" bgColor="rgba(29, 78, 216, 0.4)" barColor="#60a5fa" />
            <SummaryItem label="Carbi" value={totalCarbs} target={targetCarbs} color="#34d399" bgColor="rgba(5, 150, 105, 0.4)" barColor="#34d399" />
            <SummaryItem label="Grassi" value={totalFat} target={targetFat} color="#fbbf24" bgColor="rgba(180, 83, 9, 0.4)" barColor="#fbbf24" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
          {isToday ? 'Pasti Recenti' : 'Pasti del Giorno'}
          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full border border-slate-700">
            {meals.length}
          </span>
        </h3>

        {loading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse">Caricamento pasti...</div>
        ) : meals.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-gray-700">
            <p className="text-gray-400">Nessun pasto tracciato per {formatDate(selectedDate).toLowerCase() === 'oggi' ? 'oggi' : formatDate(selectedDate)}.</p>
            {isToday && <p className="text-gray-600 text-sm mt-1">Usa la fotocamera per iniziare!</p>}
          </div>
        ) : (
          meals.map((meal) => (
            <NutritionCard
              key={meal.id}
              meal={meal}
              onEdit={handleEditMeal}
              onDelete={handleDeleteMeal}
            />
          ))
        )}
      </div>



      {editingMeal && (
        <ConfirmMealModal
          mealData={editingMeal}
          onConfirm={handleUpdateConfirm}
          onCancel={() => setEditingMeal(null)}
          isLoading={false}
        />
      )}

    </div>
  );
}

function SummaryItem({ label, value, target, color, bgColor, barColor }) {
  const percentage = Math.min(Math.round((value / target) * 100), 100);

  return (
    <div className="text-center flex-1 p-3 rounded-2xl border transition-all" style={{ backgroundColor: bgColor, borderColor: `${color}40` }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: color, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value)}g
      </div>
      <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2" style={{ color: `${color}cc` }}>{label}</div>

      <div style={{ width: '100%', height: '8px', backgroundColor: `${color}20`, borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}80`,
            transition: 'width 1s ease-in-out'
          }}
        ></div>
      </div>
      <div className="text-[9px] text-gray-500 mt-1 font-medium opacity-80">target: {target}g</div>
    </div>
  )
}
