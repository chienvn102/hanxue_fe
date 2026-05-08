'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import {
    HSK_PRESETS, HSK_SECTION_PRESETS, HSK_AVAILABLE_LEVELS, EXAM_TYPES,
    // HSK_PRESETS giữ lại cho `summarizeLevel` hiển thị duration/passing_score.
} from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface LevelSummary {
    level: number;
    sections: { type: string; questions: number }[];
    totalQuestions: number;
    durationMinutes: number;
    passingScore: number;
}

function summarizeLevel(level: number): LevelSummary | null {
    const sections = HSK_SECTION_PRESETS[level];
    if (!sections) return null;
    const preset = HSK_PRESETS[level];
    return {
        level,
        sections: sections.map(s => ({ type: s.section_type, questions: s.total_questions })),
        totalQuestions: sections.reduce((s, x) => s + x.total_questions, 0),
        durationMinutes: preset.duration_minutes,
        passingScore: preset.passing_score,
    };
}

const SECTION_LABEL: Record<string, string> = {
    listening: 'Nghe',
    reading: 'Đọc',
    writing: 'Viết',
};

export default function AdminHskTestNewPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [level, setLevel] = useState<number>(1);
    const [form, setForm] = useState({
        title: '',
        exam_type: 'practice',
        description: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const summary = summarizeLevel(level);

    const onPickLevel = (lv: number) => {
        if (!HSK_AVAILABLE_LEVELS.includes(lv)) return;
        setLevel(lv);
        setForm(f => ({ ...f, title: `Đề HSK ${lv} mới` }));
        setStep(2);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary) return;
        setSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');

            // HF2: 1 atomic call → BE service `instantiateTemplate(level)` tạo
            // exam + sections + groups + N placeholder questions trong cùng 1
            // transaction. Nếu fail → ROLLBACK, không có state nửa vời.
            const res = await fetch(`${API_BASE}/api/hsk-exams/from-template`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    level,
                    title: form.title,
                    exam_type: form.exam_type,
                    description: form.description || null,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.data?.id) {
                throw new Error(json.message || `Không tạo được đề (HTTP ${res.status})`);
            }

            router.replace(`/admin/hsk-test?expand=${json.data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi không xác định');
            setSubmitting(false);
        }
    };

    return (
        <div>
            <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                <Link href="/admin/hsk-test" className="hover:text-[var(--primary)]">Đề thi HSK</Link>
                <Icon name="chevron_right" size="xs" />
                <span className="text-[var(--text-main)]">Tạo đề mới</span>
            </nav>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8 text-sm">
                <span className={`flex items-center gap-2 ${step === 1 ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)]'}`}>1</span>
                    Chọn cấp độ
                </span>
                <Icon name="chevron_right" size="xs" className="text-[var(--text-muted)]" />
                <span className={`flex items-center gap-2 ${step === 2 ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)]'}`}>2</span>
                    Thông tin đề
                </span>
            </div>

            {step === 1 && (
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Chọn cấp độ HSK</h1>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                        Mỗi cấp độ có cấu trúc đề riêng. Hệ thống tự động scaffold đầy đủ:
                        sections, groups (lưới ảnh / bộ từ / câu trả lời) và <strong>N câu hỏi
                        placeholder</strong> đúng số. Admin chỉ cần edit nội dung từng câu.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(lv => {
                            const isAvailable = HSK_AVAILABLE_LEVELS.includes(lv);
                            const sum = summarizeLevel(lv);
                            return (
                                <button
                                    key={lv}
                                    onClick={() => onPickLevel(lv)}
                                    disabled={!isAvailable}
                                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                                        isAvailable
                                            ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-md cursor-pointer'
                                            : 'bg-[var(--surface-secondary)] border-[var(--border)] opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <HSKBadge level={lv} className="!text-sm !px-3 !py-1" />
                                        {!isAvailable && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                                Đang chuẩn bị
                                            </span>
                                        )}
                                    </div>
                                    {sum ? (
                                        <>
                                            <div className="flex items-baseline gap-2 mb-2">
                                                <span className="text-3xl font-bold text-[var(--text-main)]">{sum.totalQuestions}</span>
                                                <span className="text-sm text-[var(--text-muted)]">câu</span>
                                                <span className="text-[var(--text-muted)]">·</span>
                                                <span className="text-sm font-semibold text-[var(--text-main)]">{sum.durationMinutes}</span>
                                                <span className="text-sm text-[var(--text-muted)]">phút</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {sum.sections.map(s => (
                                                    <li key={s.type} className="flex items-center justify-between text-sm">
                                                        <span className="text-[var(--text-secondary)]">{SECTION_LABEL[s.type]}</span>
                                                        <span className="text-[var(--text-muted)]">{s.questions} câu</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
                                                Pass ≥ {sum.passingScore} điểm
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Cấu trúc HSK {lv} sẽ được cập nhật sau.
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 2 && summary && (
                <form onSubmit={onSubmit} className="max-w-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">
                            Tạo đề <HSKBadge level={level} className="!text-sm !px-3 !py-1 align-middle" />
                        </h1>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1"
                        >
                            <Icon name="arrow_back" size="xs" />
                            Đổi cấp độ
                        </button>
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            Sẽ scaffold đầy đủ section + group + câu hỏi placeholder
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mb-3 italic">
                            Đề mới sẽ chứa N câu placeholder theo đúng chuẩn HSK {level} —
                            admin chỉ cần edit nội dung, không cần tạo câu mới từ đầu.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {summary.sections.map(s => (
                                <div key={s.type} className="bg-[var(--surface-secondary)] rounded-lg p-3 text-center">
                                    <p className="text-xs text-[var(--text-muted)]">{SECTION_LABEL[s.type]}</p>
                                    <p className="text-lg font-bold text-[var(--text-main)]">{s.questions} <span className="text-xs font-normal text-[var(--text-muted)]">câu mục tiêu</span></p>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                            Tổng {summary.totalQuestions} câu mục tiêu · {summary.durationMinutes} phút · Pass ≥ {summary.passingScore} điểm
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Tên đề thi *
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder={`VD: HSK ${level} - Đề mẫu 2024`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Loại đề
                            </label>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={form.exam_type}
                                onChange={e => setForm({ ...form, exam_type: e.target.value })}
                            >
                                {EXAM_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Practice: replay audio không giới hạn · Mock/Official: chế độ thi nghiêm ngặt.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Mô tả (tùy chọn)
                            </label>
                            <textarea
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-20 resize-none"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Nguồn đề, lưu ý cho học viên..."
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <Button type="submit" disabled={submitting || !form.title.trim()}>
                            {submitting ? 'Đang tạo skeleton...' : `Scaffold đầy đủ HSK ${level} (${summary.totalQuestions} câu placeholder)`}
                        </Button>
                        <Link href="/admin/hsk-test">
                            <Button type="button" variant="ghost">Hủy</Button>
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}
