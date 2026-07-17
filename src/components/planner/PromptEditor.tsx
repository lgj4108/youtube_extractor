'use client';

interface PromptEditorProps {
    concept: string;
    setConcept: (val: string) => void;
}

export default function PromptEditor({ concept, setConcept }: PromptEditorProps) {
    return (
        <div className="mb-6 bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl p-5 border border-indigo-100 dark:border-slate-700 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                🎯 기획 방향성 (선택 사항)
            </h3>
            <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="비워두시면 AI가 트렌드를 분석해 100% 자동으로 기획합니다."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            <p className="text-xs text-slate-500 mt-2">
                * 특별히 원하는 조건이 있을 때만 입력하세요. (예: "결말은 슬프게", "B급 코미디 스타일로")
            </p>
        </div>
    );
}