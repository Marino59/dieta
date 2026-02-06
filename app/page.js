'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import CameraInput from '@/components/CameraInput';
import NutritionCard from '@/components/NutritionCard';
import NutrientRings from '@/components/NutrientRings';
import { UtensilsCrossed, Flame, LogOut, User, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ChartBar } from 'lucide-react';
import { getMeals, deleteMeal, updateMeal, addMeal } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import ConfirmMealModal from '@/components/ConfirmMealModal';

export default function Home() {
  const authContext = useAuth();
  const user = authContext?.user;
  const authLoading = authContext?.loading ?? true;
  const logOut = authContext?.logOut;
  const router = useRouter();

  // View State: 'dashboard', 'add-meal', 'confirm-meal'
  const [currentView, setCurrentView] = useState('dashboard');
  const [addMode, setAddMode] = useState(null); // 'camera', 'text', 'barcode'
  const [pendingMealData, setPendingMealData] = useState(null); // Data from AI to be confirmed


  // App State
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

      if (updatedData.date) {
        updates.created_at = updatedData.date;
      }

      await updateMeal(editingMeal.id, updates);

      setMeals(prev => prev.map(m =>
        m.id === editingMeal.id ? { ...m, ...updates } : m
      ));
      setEditingMeal(null);
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
    // setCurrentView('dashboard'); // Handle by handleSaveNewMeal now
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


  const handleSaveNewMeal = async (confirmedData) => {
    try {
      setLoading(true); // Re-use global loading or add local saving state? 
      // Logic moved from CameraInput
      const safeNumber = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : Math.round(num);
      };

      const cleanData = {
        name: confirmedData.name || "Pasto sconosciuto",
        quantity: safeNumber(confirmedData.quantity) || 100,
        calories: safeNumber(confirmedData.calories),
        protein: safeNumber(confirmedData.protein),
        carbs: safeNumber(confirmedData.carbs),
        fat: safeNumber(confirmedData.fat),
        analysis: confirmedData.analysis || "",
      };

      // Use the date selected by the user in the modal
      const finalDate = confirmedData.date ? new Date(confirmedData.date) : new Date();

      const mealData = {
        ...cleanData,
        image_path: pendingMealData?.image_path || null,
        created_at: finalDate
      };

      const newMeal = await addMeal(mealData);

      // Update Local State
      handleMealAdded(newMeal);

      // Reset Views
      setPendingMealData(null);
      setCurrentView('dashboard');

    } catch (error) {
      console.error("Error saving meal:", error);
      alert(`Errore salvataggio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  const handleMealIdentified = (data, imageBase64) => {
    // Received data from CameraInput (AI analysis)
    setPendingMealData({ ...data, image_path: imageBase64 });
    setCurrentView('confirm-meal');
  };




  // --- VIEWS ---

  if (currentView === 'confirm-meal' && pendingMealData) {
    return (
      <ConfirmMealModal
        mealData={pendingMealData}
        onConfirm={handleSaveNewMeal}
        onCancel={() => {
          setPendingMealData(null);
          setCurrentView('add-meal');
        }}
        isLoading={loading}
        defaultDate={selectedDate}
      />
    );
  }

  if (currentView === 'add-meal') {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-safe">
        <div className="p-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition"
          >
            <ChevronLeft /> Indietro
          </button>

          <h1 className="text-3xl font-black mb-2">Aggiungi Pasto</h1>
          <p className="text-slate-400 mb-10">Scegli come inserire il tuo alimento</p>

          <div className="flex flex-col gap-4">
            <CameraInput
              onMealIdentified={handleMealIdentified}
              defaultDate={selectedDate}
              initialMode="text"
            />
          </div>
        </div>
      </div>
    )
  }

  // DASHBOARD VIEW
  return (
    <div className="min-h-screen pb-safe px-4 pt-6 bg-slate-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ciao, <span className="text-blue-400">{user?.displayName?.split(' ')[0] || 'Utente'}</span> 👋</h1>
          <p className="text-slate-400 text-sm">Ecco i tuoi progressi di oggi <span className="ml-2 text-[10px] bg-blue-900 border border-blue-500 px-2 py-0.5 rounded text-blue-200">v2.0 SUPER</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/profile')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"><User size={20} /></button>
          <button onClick={logOut} className="p-2 bg-slate-800 rounded-full hover:bg-red-900/50 text-red-400 transition"><LogOut size={20} /></button>
        </div>
      </div>

      {/* Date Picker */}
      <div className="flex items-center justify-between mb-8 bg-slate-800/50 p-1 rounded-2xl">
        <button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-700 rounded-xl transition text-slate-400"><ChevronLeft size={20} /></button>
        <div className="font-bold flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-500" />
          {formatDate(selectedDate)}
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} className={`p-3 rounded-xl transition ${isToday ? 'opacity-20' : 'hover:bg-slate-700 text-slate-400'}`}><ChevronRight size={20} /></button>
      </div>

      {/* Stats Card */}
      <div className="mb-8 bg-slate-800/50 border border-slate-700/50 rounded-[2rem] shadow-2xl backdrop-blur-sm">
        <NutrientRings
          calories={totalCalories} targetCalories={targetCalories}
          protein={totalProtein} targetProtein={targetProtein}
          carbs={totalCarbs} targetCarbs={targetCarbs}
          fat={totalFat} targetFat={targetFat}
        />
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => setCurrentView('add-meal')}
          className="aspect-square rounded-[3rem] text-white flex flex-col items-center justify-center relative overflow-hidden shadow-2xl active:scale-95 transition-all group"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', // Blue to Cyan
            boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.5)'
          }}
        >
          {/* Gloss effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />

          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <Image
              src="/Icoaggiungipasto.jpg"
              alt="Aggiungi Pasto"
              width={300}
              height={300}
              priority
              className="opacity-40 object-contain p-8"
            />
          </div>
          <div
            className="absolute bottom-8 font-black tracking-tighter bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10"
            style={{ fontSize: '1.875rem', lineHeight: '2.25rem' }} // text-3xl
          >
            AGGIUNGI
          </div>
        </button>

        <button
          onClick={() => router.push('/charts')}
          className="aspect-square rounded-[3rem] text-white flex flex-col items-center justify-center relative overflow-hidden shadow-2xl active:scale-95 transition-all group"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)', // Violet to Fuchsia
            boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.5)'
          }}
        >
          {/* Gloss effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />

          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <ChartBar size={130} strokeWidth={1.5} color="white" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
          </div>
          <div
            className="absolute bottom-8 font-black tracking-tighter bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10"
            style={{ fontSize: '1.875rem', lineHeight: '2.25rem' }} // text-3xl
          >
            GRAFICI
          </div>
        </button>
      </div>

      {/* Meal List */}
      <div className="mb-20">
        <h3 className="text-lg font-bold text-white mb-4 px-2">Diario di Oggi</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700 mx-2">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-slate-500 font-medium">Ancora nessun pasto</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map(meal => (
              <NutritionCard
                key={meal.id}
                meal={meal}
                onEdit={handleEditMeal}
                onDelete={handleDeleteMeal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Logic Components */}
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

function MiniMacro({ label, value, target, color }) {
  const p = Math.min((value / target) * 100, 100);
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 flex flex-col justify-between">
      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums leading-none mb-2">{Math.round(value)}</div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

// Add imports used in the new component code that might be missing
import { Loader2 } from 'lucide-react';
