'use client';

import { useState } from 'react';
import MusicVideoTab from '@/components/MusicVideoTab';
import PlannerTab from '@/components/PlannerTab';
import TranscriptTab from '@/components/TranscriptTab';
import MusicMasteringTab from '@/components/music/MusicMasteringTab';
import AiSettingsModal from '@/components/planner/AiSettingsModal';
import { useStoredString } from '@/lib/storage';

const TABS = [
    { id: 'planner', label: '유튜브 기획', icon: '✨' },
    { id: 'music', label: 'AI 음악 제작', icon: '🎵' },
    { id: 'mastering', label: '음원 마스터링', icon: '🎛️' },
    { id: 'transcript', label: '자막 추출', icon: '📹' },
] as const;

type TabId = typeof TABS[number]['id'];

function isTabId(value: string): value is TabId {
    return TABS.some((tab) => tab.id === value);
}

export default function CreatorDashboard() {
    const [storedTab, setStoredTab] = useStoredString('creator_active_tab', 'planner');
    const [theme, setTheme] = useStoredString('creator_theme', 'light');
    const [projectName, setProjectName] = useStoredString('creator_project_name', '새 크리에이터 프로젝트');
    const [aiProvider, setAiProvider] = useStoredString('ai_provider', 'gemini');
    const [apiKey, setApiKey] = useStoredString('ai_api_key', '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const activeTab = isTabId(storedTab) ? storedTab : 'planner';
    const isDark = theme === 'dark';

    return (
        <div className={isDark ? 'dark' : ''}>
            {isSettingsOpen && <AiSettingsModal onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />}
            <main className="min-h-screen bg-slate-50 px-4 py-8 transition-colors duration-200 dark:bg-slate-950 sm:px-6 sm:py-12">
                <div className="mx-auto w-full max-w-6xl">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Creator workflow</p>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">크리에이터 스튜디오</h1>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">트렌드 조사부터 음악 제작, 마스터링, 자막 정리까지 한곳에서 진행하세요.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="shrink-0 rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
                            title={isDark ? '라이트 모드' : '다크 모드'}
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </header>

                    <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between" aria-label="현재 프로젝트 상태">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="project-name" className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">현재 프로젝트</label>
                            <input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} className="w-full truncate bg-transparent text-sm font-extrabold text-slate-900 outline-none focus:text-indigo-600 dark:text-white dark:focus:text-indigo-300" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓ 이 브라우저에 자동 저장</span>
                            <button type="button" onClick={() => setIsSettingsOpen(true)} className={`rounded-full px-3 py-2 transition ${apiKey ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300'}`}>
                                {apiKey ? `● ${aiProvider.toUpperCase()} 키 저장됨` : '○ AI 설정 필요'}
                            </button>
                        </div>
                    </section>

                    <nav className="mb-8 overflow-x-auto pb-1" aria-label="크리에이터 도구" role="tablist">
                        <div className="flex min-w-max gap-1 rounded-2xl bg-slate-200/70 p-1.5 dark:bg-slate-800">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    id={`tab-${tab.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`panel-${tab.id}`}
                                    onClick={() => setStoredTab(tab.id)}
                                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-6 ${
                                        activeTab === tab.id
                                            ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <span aria-hidden="true">{tab.icon}</span> {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    <section id="panel-planner" role="tabpanel" aria-labelledby="tab-planner" hidden={activeTab !== 'planner'}><PlannerTab /></section>
                    <section id="panel-music" role="tabpanel" aria-labelledby="tab-music" hidden={activeTab !== 'music'}><MusicVideoTab /></section>
                    <section id="panel-mastering" role="tabpanel" aria-labelledby="tab-mastering" hidden={activeTab !== 'mastering'}><MusicMasteringTab /></section>
                    <section id="panel-transcript" role="tabpanel" aria-labelledby="tab-transcript" hidden={activeTab !== 'transcript'}><TranscriptTab /></section>
                </div>
            </main>
        </div>
    );
}
