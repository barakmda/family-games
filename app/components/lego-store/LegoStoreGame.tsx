'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  GameState, GameSpeed, ActivePanel, ProductCategory,
  StaffRole, InfluencerType, LaunchType,
} from './game/types';
import {
  createInitialState, dayTick, hireStaff, fireStaff,
  purchaseUpgrade, setSpeed, resumeFromSummary, addToast,
} from './game/engine';
import { placeOrder } from './game/economy';
import { generateAdvisorTip } from './game/ai-advisor';
import { saveGame, loadGame, hasSave, deleteSave, saveToLeaderboard } from './game/save';
import { playRegister, playDoorBell, playNotification, playGameOver as playGameOverSound } from './game/audio';
import { INFLUENCERS, LAUNCHES, BALANCE } from './game/constants';

import StoreCanvas from './StoreCanvas';
import TopBar from './ui/TopBar';
import BottomBar from './ui/BottomBar';
import InventoryPanel from './ui/InventoryPanel';
import StaffPanel from './ui/StaffPanel';
import MarketingPanel from './ui/MarketingPanel';
import UpgradePanel from './ui/UpgradePanel';
import DaySummary from './ui/DaySummary';
import EventToast from './ui/EventToast';

export default function LegoStoreGame() {
  const [phase, setPhase] = useState<GameState['phase']>('menu');
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [snapshot, setSnapshot] = useState<GameState>(() => createInitialState());
  const stateRef = useRef<GameState>(snapshot);
  const lastTimestamp = useRef(0);
  const saveTimer = useRef(0);

  // Game loop
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return;

    let raf: number;
    const loop = (timestamp: number) => {
      if (!lastTimestamp.current) lastTimestamp.current = timestamp;
      const delta = (timestamp - lastTimestamp.current) / 1000;
      lastTimestamp.current = timestamp;

      const state = stateRef.current;

      if (state.phase === 'playing' && state.speed > 0) {
        const result = dayTick(state, delta);

        if (result.salesThisTick > 0) playRegister();

        if (result.dayEnded) {
          const todayRev = state.totalRevenue;
          const todayExp = state.totalExpenses;
          state.dailySummaries.push({
            day: state.day - 1,
            revenue: todayRev,
            expenses: todayExp,
            profit: todayRev - todayExp,
            customersServed: 0,
            customersLost: 0,
            itemsSold: 0,
            reputationChange: 0,
            events: result.newEvents,
          });
          setPhase('daySummary');

          if (state.day - state.lastAdvisorDay >= BALANCE.ADVISOR_INTERVAL) {
            const tip = generateAdvisorTip(state);
            if (tip) {
              state.currentTip = tip;
              state.lastAdvisorDay = state.day;
              addToast(state, '\u{1F4A1} ' + tip.message, '\u{1F9D1}\u200D\u{1F4BC}', 'info');
            }
          }
        }

        if (result.gameOver) {
          playGameOverSound();
          saveToLeaderboard({
            day: state.day,
            totalProfit: state.totalProfit,
            reputation: state.reputation,
            date: Date.now(),
          });
          setPhase('gameover');
        }

        saveTimer.current += delta;
        if (saveTimer.current >= 30) {
          saveTimer.current = 0;
          saveGame(state);
        }
      }

      // Shallow copy for React re-render
      setSnapshot({ ...stateRef.current });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const handleStartNewGame = useCallback(() => {
    const newState = createInitialState();
    newState.phase = 'playing';
    stateRef.current = newState;
    setSnapshot({ ...newState });
    setPhase('playing');
    setActivePanel('none');
    playDoorBell();
  }, []);

  const handleContinueGame = useCallback(() => {
    const saved = loadGame();
    if (saved) {
      const loaded = { ...createInitialState(), ...saved, phase: 'playing' as const };
      stateRef.current = loaded;
      setSnapshot({ ...loaded });
      setPhase('playing');
      playDoorBell();
    }
  }, []);

  const handleSpeedChange = useCallback((speed: GameSpeed) => {
    setSpeed(stateRef.current, speed);
    setPhase(speed === 0 ? 'paused' : 'playing');
  }, []);

  const handlePanelChange = useCallback((panel: ActivePanel) => {
    setActivePanel(panel);
  }, []);

  const handleOrder = useCallback((category: ProductCategory, quantity: number) => {
    if (placeOrder(stateRef.current, category, quantity)) playNotification();
  }, []);

  const handleHire = useCallback((role: StaffRole) => {
    if (hireStaff(stateRef.current, role)) playNotification();
  }, []);

  const handleFire = useCallback((staffId: number) => {
    fireStaff(stateRef.current, staffId);
  }, []);

  const handleUpgrade = useCallback((upgradeId: string) => {
    if (purchaseUpgrade(stateRef.current, upgradeId)) playNotification();
  }, []);

  const handleInfluencer = useCallback((id: InfluencerType) => {
    const state = stateRef.current;
    const inf = INFLUENCERS.find(i => i.id === id);
    if (!inf || state.activeMarketing || state.marketingCooldown > 0) return;
    if (state.cash < inf.cost || state.reputation < inf.minReputation) return;

    state.cash -= inf.cost;
    state.totalExpenses += inf.cost;
    state.activeMarketing = {
      type: 'influencer',
      id: inf.id,
      daysRemaining: inf.duration,
      effect: inf.effect,
    };
    state.marketingCooldown = BALANCE.MARKETING_COOLDOWN;
    addToast(state, '\u05E9\u05EA"\u05E4 \u05E2\u05DD ' + inf.name + ' \u05D4\u05EA\u05D7\u05D9\u05DC!', inf.emoji, 'success');
    playNotification();
  }, []);

  const handleLaunch = useCallback((id: LaunchType) => {
    const state = stateRef.current;
    const launch = LAUNCHES.find(l => l.id === id);
    if (!launch) return;
    if (state.day - state.lastLaunchDay < BALANCE.LAUNCH_COOLDOWN) return;
    if (state.cash < launch.cost) return;

    state.cash -= launch.cost;
    state.totalExpenses += launch.cost;
    state.lastLaunchDay = state.day;
    state.activeEvents.push({
      event: {
        id: 'launch_' + id,
        name: launch.name,
        emoji: launch.emoji,
        description: '\u05D0\u05D9\u05E8\u05D5\u05E2: ' + launch.name,
        duration: launch.duration,
        effect: launch.effect,
      },
      daysRemaining: launch.duration,
    });
    addToast(state, launch.name + ' \u05D4\u05EA\u05D7\u05D9\u05DC!', launch.emoji, 'success');
    playNotification();
  }, []);

  const handleDayContinue = useCallback(() => {
    resumeFromSummary(stateRef.current);
    setPhase('playing');
    setActivePanel('none');
  }, []);

  // Use snapshot for rendering (avoids "Cannot access refs during render")
  const state = snapshot;

  // === Menu Screen ===
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-yellow-600 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-center mb-8 animate-[fadeInUp_0.5s_ease-out]">
          <div className="text-6xl mb-4">{'\u{1F9F1}'}</div>
          <h1 className="text-4xl font-black text-white mb-2">{'\u05D7\u05E0\u05D5\u05EA \u05D4\u05DC\u05D2\u05D5'}</h1>
          <p className="text-xl text-blue-200">{'\u05E7\u05E0\u05D9\u05D5\u05DF \u05E2\u05D6\u05E8\u05D9\u05D0\u05DC\u05D9, \u05EA\u05DC \u05D0\u05D1\u05D9\u05D1'}</p>
          <p className="text-sm text-blue-300 mt-2">{'\u05E1\u05D9\u05DE\u05D5\u05DC\u05E6\u05D9\u05D9\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC \u05E2\u05E1\u05E7\u05D9\u05EA'}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleStartNewGame}
            className="w-full py-4 bg-gradient-to-l from-green-500 to-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition transform hover:scale-105"
          >
            {'\u{1F3AE} \u05DE\u05E9\u05D7\u05E7 \u05D7\u05D3\u05E9'}
          </button>

          {hasSave() && (
            <button
              onClick={handleContinueGame}
              className="w-full py-4 bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition transform hover:scale-105"
            >
              {'\u{1F4BE} \u05D4\u05DE\u05E9\u05DA \u05DE\u05E9\u05D7\u05E7'}
            </button>
          )}
        </div>

        <div className="mt-8 text-center text-blue-300 text-xs max-w-sm">
          <p>{'\u05E0\u05D4\u05DC \u05D0\u05EA \u05E1\u05E0\u05D9\u05E3 \u05D4\u05DC\u05D2\u05D5 \u05D4\u05DE\u05E6\u05DC\u05D9\u05D7 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05D1\u05E7\u05E0\u05D9\u05D5\u05DF!'}</p>
          <p className="mt-1">{'\u05E0\u05D4\u05DC \u05DE\u05DC\u05D0\u05D9, \u05E6\u05D5\u05D5\u05EA, \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA, \u05E9\u05D9\u05D5\u05D5\u05E7 \u05D5\u05E9\u05D3\u05E8\u05D5\u05D2\u05D9\u05DD'}</p>
        </div>
      </div>
    );
  }

  // === Game Over Screen ===
  if (phase === 'gameover') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-800 to-gray-900 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-center animate-[fadeInUp_0.5s_ease-out]">
          <div className="text-6xl mb-4">{'\u{1F4C9}'}</div>
          <h1 className="text-3xl font-black text-white mb-2">{'\u05D4\u05D7\u05E0\u05D5\u05EA \u05E0\u05E1\u05D2\u05E8\u05D4'}</h1>
          <p className="text-red-300 mb-6">{'\u05D4\u05D7\u05D5\u05D1 \u05E2\u05D1\u05E8 \u05D0\u05EA \u05D4\u05D2\u05D1\u05D5\u05DC \u05DC-3 \u05D9\u05DE\u05D9\u05DD \u05E8\u05E6\u05D5\u05E4\u05D9\u05DD'}</p>

          <div className="bg-white/10 rounded-xl p-4 mb-6 max-w-xs mx-auto">
            <div className="text-white text-sm space-y-1">
              <p>{'\u{1F4C5} \u05D4\u05D7\u05D6\u05E7\u05EA'} {state.day} {'\u05D9\u05DE\u05D9\u05DD'}</p>
              <p>{'\u{1F4B0} \u05E8\u05D5\u05D5\u05D7 \u05DE\u05E6\u05D8\u05D1\u05E8: \u20AA'}{state.totalProfit.toLocaleString()}</p>
              <p>{'\u2B50 \u05DE\u05D5\u05E0\u05D9\u05D8\u05D9\u05DF: '}{state.reputation}/100</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button onClick={handleStartNewGame} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition">
              {'\u{1F504} \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}
            </button>
            <button onClick={() => { deleteSave(); setPhase('menu'); }} className="w-full py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition">
              {'\u{1F3E0} \u05EA\u05E4\u05E8\u05D9\u05D8 \u05E8\u05D0\u05E9\u05D9'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Playing / Paused / Day Summary ===
  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      <TopBar state={state} />

      <div className="flex-1 relative overflow-hidden">
        <StoreCanvas stateRef={stateRef} />
        <EventToast toasts={state.toasts} />

        {state.currentTip && (
          <div
            className="absolute bottom-16 right-3 max-w-[250px] bg-yellow-50 border border-yellow-200 rounded-xl p-3 shadow-lg z-20 animate-[fadeInUp_0.3s_ease-out] cursor-pointer"
            onClick={() => { stateRef.current.currentTip = null; }}
            dir="rtl"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{'\u{1F4A1}'}</span>
              <p className="text-xs text-gray-700">{state.currentTip.message}</p>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">{'\u05DC\u05D7\u05E5 \u05DC\u05E1\u05D2\u05D9\u05E8\u05D4'}</div>
          </div>
        )}

        {activePanel === 'inventory' && (
          <InventoryPanel state={state} onOrder={handleOrder} onClose={() => setActivePanel('none')} />
        )}
        {activePanel === 'staff' && (
          <StaffPanel state={state} onHire={handleHire} onFire={handleFire} onClose={() => setActivePanel('none')} />
        )}
        {activePanel === 'marketing' && (
          <MarketingPanel state={state} onInfluencer={handleInfluencer} onLaunch={handleLaunch} onClose={() => setActivePanel('none')} />
        )}
        {activePanel === 'upgrades' && (
          <UpgradePanel state={state} onPurchase={handleUpgrade} onClose={() => setActivePanel('none')} />
        )}

        {phase === 'daySummary' && (
          <DaySummary state={state} onContinue={handleDayContinue} />
        )}

        {phase === 'paused' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="bg-white/90 rounded-xl px-6 py-3 text-lg font-bold text-gray-700">
              {'\u23F8\uFE0F \u05DE\u05D5\u05E9\u05D4\u05D4'}
            </div>
          </div>
        )}
      </div>

      <BottomBar
        speed={state.speed}
        activePanel={activePanel}
        onSpeedChange={handleSpeedChange}
        onPanelChange={handlePanelChange}
      />
    </div>
  );
}
