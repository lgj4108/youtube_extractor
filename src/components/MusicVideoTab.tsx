'use client';

import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import SearchForm from './planner/SearchForm';
import AiSettingsModal from './planner/AiSettingsModal';
import PromptEditor from './planner/PromptEditor';
import VideoCard from './planner/VideoCard';

interface Scene {
    part: string;
    lyrics: string;
    prompt?: string;
    prompts?: string[];
}

interface MVPlan {
    conceptReasoning: string;
    theme: string;
    songTitle: string;
    scenes: Scene[];
}

const MUSIC_GENRES = [
    { id: 'auto', label: '✨ 자동 (트렌드 기반)' },
    { id: 'K-Pop', label: '🎤 K-Pop' },
    { id: '발라드', label: '🎧 발라드' },
    { id: '힙합/랩', label: '🤘 힙합/랩' },
    { id: 'R&B', label: '🎷 R&B/소울' },
    { id: '인디/어쿠스틱', label: '🎸 인디/어쿠스틱' },
    { id: 'EDM', label: '🪩 EDM/댄스' },
    { id: '록/메탈', label: '🔥 록/메탈' }
];

// 💡 1. 개별 언어 목록 정의 (다중 선택용)
const BASE_LANGUAGES = [
    { id: '한국어', label: '🇰🇷 한국어' },
    { id: '영어', label: '🇺🇸 영어' },
    { id: '일본어', label: '🇯🇵 일본어' },
    { id: '스페인어', label: '🇪🇸 스페인어' }
];

export default function MusicVideoTab() {
    const [keyword, setKeyword] = useState<string>('');
    const [period, setPeriod] = useState<string>('month');
    const [duration, setDuration] = useState<string>('any');
    const [region, setRegion] = useState<string>('KR');
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [savedVideos, setSavedVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');
    const [apiKey, setApiKey] = useState<string>('');

    const [concept, setConcept] = useState<string>('');
    const [selectedGenre, setSelectedGenre] = useState<string>('auto');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['한국어']); // 💡 다중 선택 상태 (배열)

    const [mvPlan, setMvPlan] = useState<MVPlan | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    useEffect(() => {
        const savedProvider = localStorage.getItem('ai_provider');
        const savedKey = localStorage.getItem('ai_api_key');
        const localData = localStorage.getItem('yt_scraped_videos');
        if (savedProvider) setAiProvider(savedProvider);
        if (savedKey) setApiKey(savedKey);
        if (localData) setSavedVideos(JSON.parse(localData));
    }, []);

    const handleToggleSave = (video: YouTubeVideo) => {
        const updated = savedVideos.some(v => v.videoId === video.videoId)
            ? savedVideos.filter(v => v.videoId !== video.videoId)
            : [...savedVideos, video];
        setSavedVideos(updated);
        localStorage.setItem('yt_scraped_videos', JSON.stringify(updated));
    };

    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;
        setLoading(true); setError(''); setMvPlan(null); setVideos([]);
        try {
            const response = await fetch('/api/planner', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, period, duration, region, categoryId: '10' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setVideos(data.rawData || []);
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleGenerateMV = async () => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        if (selectedLanguages.length === 0) { alert('최소 1개 이상의 언어를 선택해주세요.'); return; }

        setIsGenerating(true); setMvPlan(null);
        try {
            const response = await fetch('/api/music-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, concept, youtubeData: videos, genre: selectedGenre, languages: selectedLanguages }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setMvPlan(data.mvPlan);
        } catch (err: any) { alert(err.message); } finally { setIsGenerating(false); }
    };

    // 💡 체크박스 토글 로직
    const toggleLanguage = (id: string) => {
        setSelectedLanguages(prev =>
            prev.includes(id) ? prev.filter(lang => lang !== id) : [...prev, id]
        );
    };

    // 💡 전체 가사 일괄 복사 로직
    const handleCopyAllLyrics = () => {
        if (!mvPlan) return;
        const allLyrics = mvPlan.scenes.map(scene => `[${scene.part}]\n${scene.lyrics}`).join('\n\n');
        navigator.clipboard.writeText(allLyrics);
        alert('전체 가사가 복사되었습니다.');
    };

    return (
        <div className="animate-fadeIn relative">
            <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />

            <div className="absolute -top-14 right-2 sm:right-6">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-200/50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">⚙️</button>
            </div>

            <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-100 dark:border-fuchsia-800/30 p-4 rounded-xl mb-6 text-sm text-fuchsia-800 dark:text-fuchsia-300 font-bold flex items-center gap-2">
                🎵 현재 '음악(Music)' 카테고리 전용 검색 모드입니다. 트렌드를 분석하여 가사와 뮤직비디오 장면을 자동 생성합니다.
            </div>

            <SearchForm
                keyword={keyword} setKeyword={setKeyword}
                period={period} setPeriod={setPeriod}
                duration={duration} setDuration={setDuration}
                region={region} setRegion={setRegion}
                categoryId="10"
                onSubmit={handleFetchYoutube}
                loading={loading}
            />

            {videos.length > 0 && !loading && (
                <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">📺 분석된 트렌드 영상 레퍼런스</h3>
                        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">
              검색 결과 {videos.length}건
            </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {videos.map((video, index) => (
                            <VideoCard
                                key={video.videoId}
                                video={video}
                                index={index}
                                isSaved={savedVideos.some(v => v.videoId === video.videoId)}
                                onToggleSave={handleToggleSave}
                            />
                        ))}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                        <PromptEditor concept={concept} setConcept={setConcept} />

                        <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-5">
                            {/* 장르 선택 */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">🎧 타겟 음악 장르</h4>
                                <div className="flex flex-wrap gap-2">
                                    {MUSIC_GENRES.map((genre) => (
                                        <button
                                            key={genre.id}
                                            onClick={() => setSelectedGenre(genre.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                                selectedGenre === genre.id
                                                    ? 'bg-fuchsia-600 text-white shadow-md'
                                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {genre.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 💡 다중 언어 선택(체크박스 스타일) UI */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">🌐 가사 언어 조합 (다중 선택 가능)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {BASE_LANGUAGES.map((lang) => {
                                        const isSelected = selectedLanguages.includes(lang.id);
                                        return (
                                            <button
                                                key={lang.id}
                                                onClick={() => toggleLanguage(lang.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1.5 ${
                                                    isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {/* 체크 아이콘 표시 */}
                                                <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${isSelected ? 'border-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                                {lang.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleGenerateMV} disabled={isGenerating} className="w-full mb-8 px-5 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50 text-lg transition-transform hover:scale-[1.01]">
                            {isGenerating ? '🎧 풀버전 곡 작업 및 뮤직비디오 시각화 중...' : '🎧 이 트렌드로 3분 풀버전 가사 & 다이내믹 MV 프롬프트 추출하기'}
                        </button>
                    </div>
                </div>
            )}

            {loading && <div className="flex flex-col items-center justify-center py-12"><div className="w-12 h-12 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin"></div></div>}

            {/* MV 기획안 렌더링 영역 */}
            {mvPlan && (
                <div className="mb-10 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 relative">

                    {/* 💡 전체 복사 버튼을 최상단 우측에 고정 */}
                    <button
                        onClick={handleCopyAllLyrics}
                        className="absolute top-6 right-6 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/70 dark:text-indigo-200 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
                    >
                        📋 텍스트로 가사 전체 복사
                    </button>

                    {mvPlan.conceptReasoning && (
                        <div className="mb-6 mt-10 bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg border border-fuchsia-200 dark:border-slate-700 text-sm">
                            <span className="font-bold text-fuchsia-700 dark:text-fuchsia-400 mr-2">💡 AI 트렌드 분석 및 기획 의도:</span>
                            <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{mvPlan.conceptReasoning}</span>
                        </div>
                    )}

                    <div className="mb-8 text-center mt-4">
            <span className="px-3 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-700 dark:text-fuchsia-300 rounded-full text-xs font-bold mb-3 inline-block">
              {mvPlan.theme}
            </span>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">"{mvPlan.songTitle}"</h2>
                    </div>

                    <div className="space-y-6">
                        {mvPlan.scenes.map((scene, idx) => {
                            const promptList = scene.prompts && scene.prompts.length > 0
                                ? scene.prompts
                                : (scene.prompt ? [scene.prompt] : []);

                            return (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-6">

                                    {/* 좌측: 가사 영역 */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="inline-block self-start px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded mb-3 uppercase">
                                            {scene.part}
                                        </div>
                                        <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-loose flex-1">
                                            {scene.lyrics}
                                        </p>

                                        {/* 💡 개별 가사 복사 버튼 */}
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(`[${scene.part}]\n${scene.lyrics}`); alert(`${scene.part} 가사가 복사되었습니다.`); }}
                                            className="mt-3 self-start text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        >
                                            해당 파트 가사 복사
                                        </button>
                                    </div>

                                    {/* 우측: 다중 프롬프트 영역 */}
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                                        <div className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 mb-1 flex items-center gap-1">
                                            🎬 컷(Cut)별 화면 전환 프롬프트
                                        </div>

                                        {promptList.map((promptText, pIdx) => (
                                            <div key={pIdx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-400 mb-2">장면 {pIdx + 1}</span>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono break-words leading-relaxed select-all">
                                                    {promptText}
                                                </p>
                                                {/* 💡 개별 프롬프트 복사 버튼 (전체 복사 불필요 요청 반영) */}
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(promptText); alert(`장면 ${pIdx + 1} 프롬프트가 복사되었습니다.`); }}
                                                    className="mt-3 self-end px-3 py-1 bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-900/30 dark:hover:bg-fuchsia-800/50 text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 rounded transition-colors"
                                                >
                                                    프롬프트 복사
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}