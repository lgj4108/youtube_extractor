'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import {
    analyzeAudioBuffer,
    audioBufferToWav,
    buildMasteringGraph,
    cloneSettings,
    DEFAULT_MASTERING_SETTINGS,
    disconnectMasteringGraph,
    EQ_BANDS,
    type EqBandKey,
    MASTERING_PRESETS,
    type MasteringGraph,
    type MasteringSettings,
    type PresetKey,
    updateMasteringGraph,
} from '@/lib/audio/mastering';
import { getErrorMessage } from '@/lib/errors';
import { useStoredJson, useStoredString } from '@/lib/storage';

const MAX_AUDIO_SIZE = 250 * 1024 * 1024;
const INITIAL_MASTERING_SETTINGS = cloneSettings(DEFAULT_MASTERING_SETTINGS);
const EMPTY_CUSTOM_PRESET: MasteringSettings | null = null;
type ScalarSettingKey = Exclude<keyof MasteringSettings, 'eq'>;

interface SliderProps {
    description: string;
    label: string;
    max: number;
    min: number;
    onChange: (value: number) => void;
    step?: number;
    unit?: string;
    value: number;
}

function MasteringSlider({ description, label, max, min, onChange, step = 1, unit = '%', value }: SliderProps) {
    const displayValue = value > 0 && min < 0 ? `+${value}` : String(value);
    return (
        <label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">{label}</span>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{displayValue}{unit}</span>
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{description}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
            />
        </label>
    );
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAudioContext() {
    const AudioContextConstructor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
    return new AudioContextConstructor();
}

export default function MusicMasteringTab() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioStats, setAudioStats] = useState<ReturnType<typeof analyzeAudioBuffer> | null>(null);
    const [settings, setSettings] = useStoredJson<MasteringSettings>('mastering_settings', INITIAL_MASTERING_SETTINGS);
    const [activePreset, setActivePreset] = useStoredJson<PresetKey | 'CUSTOM'>('mastering_active_preset', 'CLEAN');
    const [customPreset, setCustomPreset] = useStoredJson<MasteringSettings | null>('mastering_custom_preset', EMPTY_CUSTOM_PRESET);
    const [masteringMode, setMasteringMode] = useStoredString('mastering_mode', 'basic');
    const [isBypassed, setIsBypassed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [position, setPosition] = useState(0);
    const [bitDepth, setBitDepth] = useState<16 | 24>(24);
    const [normalize, setNormalize] = useState(true);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const graphRef = useRef<MasteringGraph | null>(null);
    const startedAtRef = useRef(0);
    const offsetRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastProgressUpdateRef = useRef(0);
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showNotice = (message: string, type: 'error' | 'success' = 'success') => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setNotice({ message, type });
        noticeTimerRef.current = setTimeout(() => setNotice(null), 3_000);
    };

    const teardownPlayback = (stopSource = true) => {
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        if (graphRef.current) disconnectMasteringGraph(graphRef.current, stopSource);
        graphRef.current = null;
    };

    const pausePlayback = () => {
        const context = audioContextRef.current;
        const buffer = audioBufferRef.current;
        if (context && buffer && graphRef.current) {
            const nextPosition = Math.min(buffer.duration, Math.max(0, context.currentTime - startedAtRef.current));
            offsetRef.current = nextPosition;
            setPosition(nextPosition);
        }
        teardownPlayback();
        setIsPlaying(false);
    };

    const startProgressLoop = () => {
        const tick = (timestamp: number) => {
            const context = audioContextRef.current;
            const buffer = audioBufferRef.current;
            if (!context || !buffer || !graphRef.current) return;

            if (timestamp - lastProgressUpdateRef.current >= 80) {
                const nextPosition = Math.min(buffer.duration, Math.max(0, context.currentTime - startedAtRef.current));
                offsetRef.current = nextPosition;
                setPosition(nextPosition);
                lastProgressUpdateRef.current = timestamp;
            }
            animationFrameRef.current = requestAnimationFrame(tick);
        };
        animationFrameRef.current = requestAnimationFrame(tick);
    };

    const startPlayback = async (requestedOffset = offsetRef.current) => {
        const buffer = audioBufferRef.current;
        if (!buffer) return;

        try {
            if (!audioContextRef.current) audioContextRef.current = getAudioContext();
            const context = audioContextRef.current;
            if (context.state === 'suspended') await context.resume();
            teardownPlayback();

            const offset = requestedOffset >= buffer.duration - 0.01 ? 0 : Math.max(0, requestedOffset);
            const graph = buildMasteringGraph(context, buffer, settings, isBypassed);
            graphRef.current = graph;
            offsetRef.current = offset;
            setPosition(offset);
            startedAtRef.current = context.currentTime - offset;

            graph.source.onended = () => {
                if (graphRef.current !== graph) return;
                teardownPlayback(false);
                offsetRef.current = 0;
                setPosition(buffer.duration);
                setIsPlaying(false);
            };
            graph.source.start(0, offset);
            setIsPlaying(true);
            startProgressLoop();
        } catch (error: unknown) {
            teardownPlayback();
            setIsPlaying(false);
            showNotice(getErrorMessage(error, '미리듣기를 시작하지 못했습니다.'), 'error');
        }
    };

    const handlePlayPause = () => {
        if (isPlaying) pausePlayback();
        else void startPlayback();
    };

    const handleSeek = (nextPosition: number) => {
        if (isPlaying) {
            teardownPlayback();
            setIsPlaying(false);
        }
        offsetRef.current = nextPosition;
        setPosition(nextPosition);
    };

    const handleRestart = () => {
        offsetRef.current = 0;
        setPosition(0);
        if (isPlaying) void startPlayback(0);
    };

    const loadAudioFile = async (file: File) => {
        const looksLikeAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
        if (!looksLikeAudio) {
            showNotice('지원되는 오디오 파일을 선택해주세요.', 'error');
            return;
        }
        if (file.size > MAX_AUDIO_SIZE) {
            showNotice('브라우저 메모리 보호를 위해 250MB 이하 파일만 처리할 수 있습니다.', 'error');
            return;
        }

        setIsLoading(true);
        pausePlayback();
        try {
            if (!audioContextRef.current) audioContextRef.current = getAudioContext();
            const arrayBuffer = await file.arrayBuffer();
            const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            if (!decodedBuffer.length || !Number.isFinite(decodedBuffer.duration)) {
                throw new Error('오디오 데이터를 해석할 수 없습니다.');
            }

            audioBufferRef.current = decodedBuffer;
            offsetRef.current = 0;
            setPosition(0);
            setAudioFile(file);
            setAudioStats(analyzeAudioBuffer(decodedBuffer));
            showNotice('음원을 불러왔습니다. 프리셋을 고른 뒤 원본과 비교해보세요.');
        } catch (error: unknown) {
            showNotice(getErrorMessage(error, '파일을 디코딩하지 못했습니다.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void loadAudioFile(file);
    };

    const applyPreset = (presetKey: PresetKey) => {
        setSettings(cloneSettings(MASTERING_PRESETS[presetKey].settings));
        setActivePreset(presetKey);
    };

    const updateSetting = (key: ScalarSettingKey, value: number) => {
        setSettings((current) => ({ ...current, [key]: value }));
        setActivePreset('CUSTOM');
    };

    const updateEq = (key: EqBandKey, value: number) => {
        setSettings((current) => ({ ...current, eq: { ...current.eq, [key]: value } }));
        setActivePreset('CUSTOM');
    };

    const handleExport = async () => {
        const sourceBuffer = audioBufferRef.current;
        if (!sourceBuffer || !audioFile) return;

        setIsProcessing(true);
        try {
            const offlineContext = new OfflineAudioContext(2, sourceBuffer.length, sourceBuffer.sampleRate);
            const graph = buildMasteringGraph(offlineContext, sourceBuffer, settings, false);
            graph.source.start(0);
            const renderedBuffer = await offlineContext.startRendering();
            disconnectMasteringGraph(graph, false);
            const blob = audioBufferToWav(renderedBuffer, { bitDepth, normalize, targetPeakDb: -1 });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            const baseName = audioFile.name.replace(/\.[^.]+$/, '') || 'track';
            anchor.href = url;
            anchor.download = `${baseName}_mastered_${bitDepth}bit.wav`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1_000);
            showNotice('마스터 WAV 파일을 만들었습니다.');
        } catch (error: unknown) {
            showNotice(getErrorMessage(error, '마스터 파일을 렌더링하지 못했습니다.'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const graph = graphRef.current;
        const context = audioContextRef.current;
        if (graph && context) updateMasteringGraph(graph, settings, context.currentTime, isBypassed);
    }, [isBypassed, settings]);

    useEffect(() => () => {
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
        if (graphRef.current) disconnectMasteringGraph(graphRef.current);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        void audioContextRef.current?.close();
    }, []);

    const activeDescription = activePreset === 'CUSTOM'
        ? '직접 조정한 사용자 설정입니다.'
        : MASTERING_PRESETS[activePreset].description;

    return (
        <div className="animate-fadeIn overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {notice && (
                <div className={`fixed left-1/2 top-6 z-[250] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full px-5 py-3 text-center text-sm font-bold text-white shadow-2xl ${notice.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`} role="status" aria-live="polite">
                    {notice.type === 'error' ? '⚠️' : '✓'} {notice.message}
                </div>
            )}

            <header className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Browser mastering suite</p>
                        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white sm:text-3xl">음원 마스터링 스튜디오</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">EQ, 다이나믹스, 미드·사이드 기반 스테레오 폭과 피크 리미터를 적용합니다. 음원은 서버에 업로드하지 않고 브라우저 안에서 처리합니다.</p>
                    </div>
                    <button type="button" onClick={() => applyPreset('CLEAN')} className="self-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">설정 초기화</button>
                </div>
            </header>

            <div className="space-y-6 p-4 sm:p-6">
                <label
                    onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
                    onDrop={handleDrop}
                    className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-6 text-center transition dark:bg-slate-900 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700'}`}
                >
                    <input type="file" accept="audio/*,.flac" className="sr-only" disabled={isLoading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadAudioFile(file); event.target.value = ''; }} />
                    <span className="text-3xl" aria-hidden="true">{isLoading ? '⏳' : audioFile ? '🎧' : '📁'}</span>
                    <span className="mt-2 max-w-full truncate text-sm font-extrabold text-slate-800 dark:text-slate-200">{isLoading ? '오디오 분석 중...' : audioFile?.name ?? '클릭하거나 음원 파일을 끌어다 놓으세요'}</span>
                    <span className="mt-1 text-xs text-slate-400">MP3, WAV, M4A, AAC, OGG, FLAC · 최대 250MB</span>
                </label>

                {audioFile && audioStats && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="오디오 미리듣기">
                        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{audioFile.name}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{formatFileSize(audioFile.size)}</span>
                                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{(audioStats.sampleRate / 1_000).toFixed(1)} kHz</span>
                                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{audioStats.channels === 1 ? 'Mono' : `${audioStats.channels} channels`}</span>
                                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">입력 피크 {Number.isFinite(audioStats.peakDb) ? audioStats.peakDb.toFixed(1) : '−∞'} dBFS</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={handlePlayPause} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700">{isPlaying ? '⏸ 일시정지' : '▶ 미리듣기'}</button>
                                <button type="button" onClick={handleRestart} className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300" aria-label="처음으로">↺</button>
                                <button type="button" onClick={() => setIsBypassed((bypassed) => !bypassed)} aria-pressed={isBypassed} className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${isBypassed ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>{isBypassed ? 'A 원본 듣는 중' : 'B 마스터 듣는 중'}</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-10 text-right font-mono text-xs text-slate-500">{formatTime(position)}</span>
                            <input type="range" min="0" max={audioStats.duration} step="0.01" value={Math.min(position, audioStats.duration)} onChange={(event) => handleSeek(Number(event.target.value))} className="w-full accent-indigo-600" aria-label="재생 위치" />
                            <span className="w-10 font-mono text-xs text-slate-500">{formatTime(audioStats.duration)}</span>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">빠른 프리셋</h3>
                            <p className="mt-1 text-xs text-slate-400">{activeDescription}</p>
                        </div>
                        {activePreset === 'CUSTOM' && <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">CUSTOM</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        {(Object.keys(MASTERING_PRESETS) as PresetKey[]).map((presetKey) => (
                            <button key={presetKey} type="button" onClick={() => applyPreset(presetKey)} className={`rounded-xl px-3 py-3 text-xs font-bold transition ${activePreset === presetKey ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                                {MASTERING_PRESETS[presetKey].label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setCustomPreset(cloneSettings(settings)); showNotice('현재 값을 내 프리셋으로 저장했습니다.'); }} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">현재 설정 저장</button>
                        <button type="button" disabled={!customPreset} onClick={() => { if (customPreset) { setSettings(cloneSettings(customPreset)); setActivePreset('CUSTOM'); } }} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300">내 프리셋 불러오기</button>
                    </div>
                </section>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div><p className="text-sm font-extrabold text-slate-900 dark:text-white">세부 음향 조정</p><p className="mt-1 text-xs text-slate-400">처음에는 프리셋만으로 충분합니다. 필요한 경우 전문가 설정을 여세요.</p></div>
                    <button type="button" onClick={() => setMasteringMode(masteringMode === 'expert' ? 'basic' : 'expert')} aria-expanded={masteringMode === 'expert'} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{masteringMode === 'expert' ? '간단히 보기' : '전문가 설정'}</button>
                </div>

                {masteringMode === 'expert' && <div className="grid gap-6 animate-fadeIn lg:grid-cols-[0.9fr_1.6fr]">
                    <section className="space-y-3" aria-labelledby="dynamics-title">
                        <h3 id="dynamics-title" className="px-1 text-sm font-extrabold text-slate-900 dark:text-white">다이나믹스 & 이미지</h3>
                        <MasteringSlider label="Compression" description="피크를 정돈하고 평균 밀도를 높입니다." min={0} max={100} value={settings.compression} onChange={(value) => updateSetting('compression', value)} />
                        <MasteringSlider label="Saturation" description="부드러운 배음과 질감을 더합니다." min={0} max={100} value={settings.drive} onChange={(value) => updateSetting('drive', value)} />
                        <MasteringSlider label="Sibilance control" description="6.5kHz 이상의 거친 고역을 정적으로 완화합니다." min={0} max={100} value={settings.deEsser} onChange={(value) => updateSetting('deEsser', value)} />
                        <MasteringSlider label="Stereo width" description="음수는 모노에 가깝게, 양수는 사이드 성분을 넓힙니다." min={-100} max={100} value={settings.stereoWidth} onChange={(value) => updateSetting('stereoWidth', value)} />
                        <MasteringSlider label="Output trim" description="리미터에 들어가기 전 최종 레벨을 미세 조정합니다." min={-6} max={3} step={0.1} unit=" dB" value={settings.outputGain} onChange={(value) => updateSetting('outputGain', value)} />
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl" aria-labelledby="eq-title">
                        <div className="mb-5 flex items-end justify-between gap-3">
                            <div>
                                <h3 id="eq-title" className="text-sm font-extrabold text-white">7밴드 톤 셰이핑 EQ</h3>
                                <p className="mt-1 text-xs text-slate-500">과도한 보정보다 ±3dB 안쪽의 작은 움직임부터 권장합니다.</p>
                            </div>
                            <button type="button" onClick={() => { setSettings((current) => ({ ...current, eq: cloneSettings(DEFAULT_MASTERING_SETTINGS).eq })); setActivePreset('CUSTOM'); }} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700">EQ 평탄화</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {EQ_BANDS.map((band) => {
                                const value = settings.eq[band.key];
                                return (
                                    <label key={band.key} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                        <span className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-300">{band.label} <span className="font-normal text-slate-600">{band.description}</span></span>
                                            <span className={`font-mono text-xs font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-500'}`}>{value > 0 ? '+' : ''}{value.toFixed(1)} dB</span>
                                        </span>
                                        <input type="range" min="-12" max="12" step="0.1" value={value} onChange={(event) => updateEq(band.key, Number(event.target.value))} className="mt-3 w-full accent-indigo-500" />
                                    </label>
                                );
                            })}
                        </div>
                    </section>
                </div>}

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">마스터 WAV 내보내기</h3>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-800/70 dark:text-emerald-300/60">−1 dBFS 피크 정규화는 전체 곡의 피크를 맞추며, 통합 LUFS 측정과는 다릅니다.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                <input type="checkbox" checked={normalize} onChange={(event) => setNormalize(event.target.checked)} className="accent-emerald-600" /> −1 dBFS 정규화
                            </label>
                            <select value={bitDepth} onChange={(event) => setBitDepth(Number(event.target.value) as 16 | 24)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-950 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-200" aria-label="WAV 비트 깊이">
                                <option value={24}>24-bit WAV</option>
                                <option value={16}>16-bit WAV</option>
                            </select>
                            <button type="button" onClick={() => void handleExport()} disabled={!audioFile || isLoading || isProcessing} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                                {isProcessing ? '렌더링 중...' : '마스터 파일 저장'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
