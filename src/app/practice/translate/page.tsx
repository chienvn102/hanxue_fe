'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { fetchTranslatePrompt, gradeTranslate, TranslatePrompt, TranslateGrade } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';

type Phase = 'loading' | 'answering' | 'grading' | 'graded' | 'error';

function TranslateGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuth();

    const hskRaw = searchParams.get('hsk');
    const hskInt = hskRaw ? parseInt(hskRaw, 10) : NaN;
    const hsk = Number.isFinite(hskInt) && hskInt >= 1 && hskInt <= 6 ? hskInt : 1;

    const [phase, setPhase] = useState<Phase>('loading');
    const [prompt, setPrompt] = useState<TranslatePrompt | null>(null);
    const [userZh, setUserZh] = useState('');
    const [grade, setGrade] = useState<TranslateGrade | null>(null);
    const [errMsg, setErrMsg] = useState('');
    const [totalXp, setTotalXp] = useState(0);

    const changeHsk = (next: number) => {
        if (next === hsk) return;
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('hsk', String(next));
        router.replace(`/practice/translate?${sp.toString()}`);
    };

    // Map các lỗi fetch của browser/network sang message tiếng Việt rõ ràng.
    const friendlyErr = (e: unknown): string => {
        const raw = e instanceof Error ? e.message : String(e);
        if (/Failed to fetch|NetworkError|TypeError/i.test(raw)) {
            return 'Mất kết nối tới server. Kiểm tra mạng hoặc thử lại sau.';
        }
        if (/quá chậm|timeout/i.test(raw)) {
            return 'AI phản hồi quá chậm. Thử lại nhé.';
        }
        if (/quá tải|429/i.test(raw)) {
            return 'AI đang quá tải, vui lòng thử lại sau 1 phút.';
        }
        if (/het luot|đã hết|exceeded/i.test(raw)) {
            return 'Bạn đã dùng hết lượt AI hôm nay. Quay lại ngày mai nhé.';
        }
        return raw || 'Lỗi tải câu';
    };

    const loadPrompt = useCallback(async () => {
        setPhase('loading');
        setErrMsg('');
        setUserZh('');
        setGrade(null);
        try {
            const data = await fetchTranslatePrompt(hsk);
            setPrompt(data);
            setPhase('answering');
        } catch (e) {
            setErrMsg(friendlyErr(e));
            setPhase('error');
        }
    }, [hsk]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadPrompt();
    }, [isAuthenticated, loadPrompt, router]);

    const handleSubmit = async () => {
        if (!prompt || !userZh.trim()) return;
        setPhase('grading');
        setErrMsg('');
        try {
            const result = await gradeTranslate({
                token: prompt.token,
                user_zh: userZh.trim(),
            });
            setGrade(result);
            setTotalXp(prev => prev + (result.xpEarned || 0));
            setPhase('graded');
        } catch (e) {
            setErrMsg(friendlyErr(e));
            setPhase('answering'); // cho user thử submit lại
        }
    };

    const scoreColor = (s: number) => s >= 80 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                            <Icon name="translate" className="text-indigo-500" />
                            Dịch câu
                        </h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            AI sinh câu tiếng Việt theo HSK {hsk}, bạn dịch sang tiếng Trung.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={hsk}
                            onChange={e => changeHsk(parseInt(e.target.value, 10))}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                            title="Đổi HSK level"
                        >
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>HSK {n}</option>
                            ))}
                        </select>
                        <span className="text-sm text-[var(--text-muted)]">
                            <Icon name="bolt" size="xs" className="text-yellow-500 inline" /> +{totalXp} XP
                        </span>
                        <Link href="/practice">
                            <Button variant="secondary" size="sm">← Quay lại</Button>
                        </Link>
                    </div>
                </div>

                {phase === 'loading' && (
                    <div className="text-center py-20 text-[var(--text-muted)]">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        AI đang sinh câu mới...
                    </div>
                )}

                {phase === 'error' && (
                    <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                        <Icon name="error_outline" size="xl" className="text-red-500 mb-3" />
                        <p className="text-[var(--text-secondary)] mb-4">{errMsg}</p>
                        <Button onClick={loadPrompt}>Thử lại</Button>
                    </div>
                )}

                {(phase === 'answering' || phase === 'grading' || phase === 'graded') && prompt && (
                    <div className="space-y-5">
                        {/* Câu nguồn */}
                        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-indigo-500 mb-2">
                                <Icon name="format_quote" size="xs" />
                                Câu tiếng Việt
                            </div>
                            <p className="text-lg text-[var(--text-main)] leading-relaxed">{prompt.vi}</p>
                        </div>

                        {/* Input */}
                        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                            <label className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2 block">
                                Bản dịch tiếng Trung của bạn
                            </label>
                            <textarea
                                value={userZh}
                                onChange={e => setUserZh(e.target.value)}
                                disabled={phase !== 'answering'}
                                placeholder="Gõ tiếng Trung giản thể vào đây..."
                                rows={3}
                                className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none font-medium text-lg disabled:opacity-60"
                            />
                            {errMsg && phase === 'answering' && (
                                <p className="text-sm text-red-500 mt-2">{errMsg}</p>
                            )}
                            <div className="flex gap-2 mt-3 justify-end">
                                {phase !== 'graded' ? (
                                    <Button onClick={handleSubmit} disabled={phase !== 'answering' || !userZh.trim()}>
                                        {phase === 'grading' ? (
                                            <>
                                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                                Đang chấm...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="send" size="sm" />
                                                Nộp bài
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button onClick={loadPrompt}>
                                        <Icon name="refresh" size="sm" />
                                        Câu tiếp theo
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Kết quả */}
                        {phase === 'graded' && grade && (
                            <div className="p-5 rounded-2xl bg-[var(--surface)] border-2 border-[var(--border)]">
                                <div className="flex items-baseline justify-between mb-3">
                                    <h3 className="text-sm uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                                        Kết quả
                                    </h3>
                                    <div className="flex items-baseline gap-3">
                                        <span className={`text-3xl font-bold ${scoreColor(grade.score)}`}>
                                            {grade.score}
                                        </span>
                                        <span className="text-sm text-[var(--text-muted)]">/100</span>
                                        {grade.xpEarned > 0 && (
                                            <span className="text-xs text-yellow-500 font-semibold">
                                                +{grade.xpEarned} XP
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-3 p-3 rounded-lg bg-[var(--surface-secondary)]">
                                    <div className="text-xs uppercase font-semibold text-[var(--text-muted)] mb-1">Bản dịch khuyên dùng</div>
                                    <div className="hanzi text-lg text-[var(--text-main)]">{grade.correctZh}</div>
                                    {grade.expectedPinyin && (
                                        <div className="text-xs text-[var(--text-muted)] mt-1">{grade.expectedPinyin}</div>
                                    )}
                                </div>

                                {grade.feedbackVi && (
                                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        <Icon name="lightbulb" size="xs" className="text-amber-500 inline mr-1" />
                                        {grade.feedbackVi}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default function PracticeTranslatePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <TranslateGameContent />
        </Suspense>
    );
}
