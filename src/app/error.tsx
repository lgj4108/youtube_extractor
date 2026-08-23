'use client';

import { useEffect } from 'react';

export default function ErrorPage({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
}) {
    useEffect(() => {
        console.error('화면 렌더링 오류:', error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="mb-3 text-4xl" aria-hidden="true">🛠️</p>
                <h1 className="text-xl font-extrabold text-slate-900">화면을 불러오지 못했습니다</h1>
                <p className="mt-2 text-sm text-slate-500">작업 데이터는 브라우저에 남아 있습니다. 다시 시도해 복구해주세요.</p>
                <button onClick={unstable_retry} className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">다시 시도</button>
            </div>
        </main>
    );
}
