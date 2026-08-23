'use client';

import { copyText } from '@/lib/http';

interface SunoCreativeSettingsProps {
    weirdness?: number;
    styleInfluence?: number;
    reason?: string;
    showToast: (message: string) => void;
}

export function normalizeSunoSetting(value: unknown, fallback: number) {
    const numeric = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number.parseFloat(value)
            : Number.NaN;
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function getSunoCreativeSettings(settings: Pick<SunoCreativeSettingsProps, 'weirdness' | 'styleInfluence' | 'reason'>) {
    return {
        weirdness: normalizeSunoSetting(settings.weirdness, 50),
        styleInfluence: normalizeSunoSetting(settings.styleInfluence, 80),
        reason: settings.reason?.trim() || '균형 잡힌 창의성과 스타일 재현을 위한 기본 추천값입니다.',
    };
}

export function formatSunoCreativeSettings(settings: Pick<SunoCreativeSettingsProps, 'weirdness' | 'styleInfluence' | 'reason'>) {
    const normalized = getSunoCreativeSettings(settings);
    return [
        `Weirdness: ${normalized.weirdness}%`,
        `Style Influence: ${normalized.styleInfluence}%`,
        `추천 이유: ${normalized.reason}`,
    ].join('\n');
}

export default function SunoCreativeSettings({ weirdness, styleInfluence, reason, showToast }: SunoCreativeSettingsProps) {
    const settings = getSunoCreativeSettings({ weirdness, styleInfluence, reason });

    const handleCopy = async () => {
        try {
            await copyText(formatSunoCreativeSettings({ weirdness, styleInfluence, reason }));
            showToast('Suno 추천 설정값이 복사되었습니다.');
        } catch {
            showToast('추천 설정값을 복사하지 못했습니다.');
        }
    };

    return (
        <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/30">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-violet-700 dark:text-violet-300">🎚️ Suno Creative Sliders 추천</p>
                <button onClick={() => void handleCopy()} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700">
                    설정 복사
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: 'Weirdness', value: settings.weirdness, color: 'bg-fuchsia-500' },
                    { label: 'Style Influence', value: settings.styleInfluence, color: 'bg-indigo-500' },
                ].map((setting) => (
                    <div key={setting.label} className="rounded-md bg-white/80 p-2 dark:bg-slate-900/70">
                        <div className="mb-1.5 flex items-center justify-between gap-1">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{setting.label}</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{setting.value}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                            <div className={`h-full rounded-full ${setting.color}`} style={{ width: `${setting.value}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">{settings.reason}</p>
        </div>
    );
}
