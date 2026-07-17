'use client';

import { useState } from 'react';
import PlannerTab from '@/components/PlannerTab';
import MusicVideoTab from '@/components/MusicVideoTab'; // 새로 만든 탭 임포트

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState<'planner' | 'music'>('planner');
  const [isDark, setIsDark] = useState<boolean>(false);

  return (
      <div className={isDark ? 'dark' : ''}>
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 flex flex-col items-center py-12 px-4 sm:px-6">
          <div className="w-full max-w-5xl relative">

            <button onClick={() => setIsDark(!isDark)} className="absolute top-0 right-0 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 text-slate-600 dark:text-slate-300">
              {isDark ? '☀️' : '🌙'}
            </button>

            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">🚀 크리에이터 스튜디오</h1>
            </div>

            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-slate-200/60 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
                <button
                    onClick={() => setActiveTab('planner')}
                    className={`px-8 py-3 text-sm font-bold rounded-xl transition-all ${
                        activeTab === 'planner' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  ✨ 일반 유튜브 기획자
                </button>
                <button
                    onClick={() => setActiveTab('music')}
                    className={`px-8 py-3 text-sm font-bold rounded-xl transition-all ${
                        activeTab === 'music' ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  🎵 AI 뮤직비디오 메이커
                </button>
              </div>
            </div>

            {/* 탭 전환 (CSS Hiding으로 상태 유지) */}
            <div className={activeTab === 'planner' ? 'block' : 'hidden'}><PlannerTab /></div>
            <div className={activeTab === 'music' ? 'block' : 'hidden'}><MusicVideoTab /></div>

          </div>
        </main>
      </div>
  );
}