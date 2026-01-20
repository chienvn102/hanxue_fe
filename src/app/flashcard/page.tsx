'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type QuizMode = 'write' | 'choice';

const hskLevels = [
    { level: 1, label: 'Cơ bản', color: 'blue' },
    { level: 2, label: 'Sơ cấp', color: 'teal' },
    { level: 3, label: 'Trung cấp', color: 'orange' },
    { level: 4, label: 'Trung cao', color: 'red' },
    { level: 5, label: 'Cao cấp', color: 'purple' },
    { level: 6, label: 'Thượng thừa', color: 'indigo' },
];

const colorClasses: Record<string, { text: string; ring: string; bg: string; bar: string }> = {
    blue: { text: 'text-blue-500', ring: 'ring-blue-500', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
    teal: { text: 'text-teal-500', ring: 'ring-teal-500', bg: 'bg-teal-500/10', bar: 'bg-teal-500' },
    orange: { text: 'text-orange-500', ring: 'ring-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500' },
    red: { text: 'text-red-500', ring: 'ring-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500' },
    purple: { text: 'text-purple-500', ring: 'ring-purple-500', bg: 'bg-purple-500/10', bar: 'bg-purple-500' },
    indigo: { text: 'text-indigo-500', ring: 'ring-indigo-500', bg: 'bg-indigo-500/10', bar: 'bg-indigo-500' },
};

export default function FlashcardPage() {
    const router = useRouter();
    const [hskLevel, setHskLevel] = useState<number>(1);
    const [wordCount, setWordCount] = useState<number>(20);
    const [quizMode, setQuizMode] = useState<QuizMode>('choice');

    const handleStart = () => {
        const params = new URLSearchParams({
            hsk: hskLevel.toString(),
            limit: wordCount.toString(),
            mode: quizMode
        });
        router.push(`/flashcard/session?${params.toString()}`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 px-4 py-8 md:px-10 lg:px-40">
                <div className="mx-auto max-w-5xl">
                    {/* Title Section */}
                    <div className="mb-10 flex flex-col gap-2">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-main)]">
                            Thiết lập Flashcard
                        </h1>
                        <p className="text-[var(--text-secondary)] text-base md:text-lg">
                            Tùy chỉnh phiên học từ vựng của bạn để đạt hiệu quả tốt nhất.
                        </p>
                    </div>

                    {/* HSK Level Selection */}
                    <section className="mb-12">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-[var(--text-main)]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                                <Icon name="school" size="sm" />
                            </span>
                            Chọn cấp độ HSK
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {hskLevels.map((hsk) => {
                                const isSelected = hskLevel === hsk.level;
                                const colors = colorClasses[hsk.color];

                                return (
                                    <button
                                        key={hsk.level}
                                        onClick={() => setHskLevel(hsk.level)}
                                        className={`group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 transition-all cursor-pointer
                                            ${isSelected
                                                ? `ring-2 ${colors.ring} shadow-lg ${colors.bg}`
                                                : 'bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-2'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className={`absolute top-3 right-3 ${colors.text}`}>
                                                <Icon name="check_circle" size="sm" filled />
                                            </div>
                                        )}
                                        <span className={`text-3xl font-black ${colors.text}`}>
                                            {hsk.level}
                                        </span>
                                        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                            {hsk.label}
                                        </span>
                                        <div className={`absolute bottom-0 h-1 w-full ${colors.bar}`}></div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Word Count & Quiz Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        {/* Word Count */}
                        <section className="flex flex-col">
                            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-[var(--text-main)]">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                                    <Icon name="filter_9_plus" size="sm" />
                                </span>
                                Số lượng từ
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {[10, 20, 50].map((count) => {
                                    const isSelected = wordCount === count;

                                    return (
                                        <button
                                            key={count}
                                            onClick={() => setWordCount(count)}
                                            className={`relative flex flex-col items-center justify-center rounded-2xl p-6 transition-all cursor-pointer
                                                ${isSelected
                                                    ? 'ring-2 ring-[var(--primary)] shadow-lg bg-[var(--surface)]'
                                                    : 'bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/50'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white text-xs">
                                                    <Icon name="check" size="sm" />
                                                </div>
                                            )}
                                            <span className={`text-2xl font-bold ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                                {count}
                                            </span>
                                            <span className={`text-xs ${isSelected ? 'text-[var(--primary)]/80 font-medium' : 'text-[var(--text-secondary)]'}`}>
                                                từ
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Quiz Mode */}
                        <section className="flex flex-col">
                            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-[var(--text-main)]">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                                    <Icon name="tune" size="sm" />
                                </span>
                                Chế độ học
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Multiple Choice Mode */}
                                <button
                                    onClick={() => setQuizMode('choice')}
                                    className={`relative flex flex-col items-start justify-between rounded-2xl p-5 text-left transition-all cursor-pointer
                                        ${quizMode === 'choice'
                                            ? 'ring-2 ring-[var(--primary)] shadow-lg bg-[var(--surface)]'
                                            : 'bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/50'
                                        }`}
                                >
                                    <div className={`mb-4 rounded-lg p-3 ${quizMode === 'choice' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>
                                        <Icon name="check_box" size="lg" />
                                    </div>
                                    <div>
                                        <p className={`font-bold ${quizMode === 'choice' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                            Trắc nghiệm
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Chọn đáp án đúng</p>
                                    </div>
                                    <div className={`absolute top-4 right-4 ${quizMode === 'choice' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                        <Icon name={quizMode === 'choice' ? 'radio_button_checked' : 'radio_button_unchecked'} />
                                    </div>
                                </button>

                                {/* Write Mode */}
                                <button
                                    onClick={() => setQuizMode('write')}
                                    className={`relative flex flex-col items-start justify-between rounded-2xl p-5 text-left transition-all cursor-pointer
                                        ${quizMode === 'write'
                                            ? 'ring-2 ring-[var(--primary)] shadow-lg bg-[var(--surface)]'
                                            : 'bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/50'
                                        }`}
                                >
                                    <div className={`mb-4 rounded-lg p-3 ${quizMode === 'write' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>
                                        <Icon name="edit_note" size="lg" />
                                    </div>
                                    <div>
                                        <p className={`font-bold ${quizMode === 'write' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                            Tự luận
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Gõ từ hoặc viết tay</p>
                                    </div>
                                    <div className={`absolute top-4 right-4 ${quizMode === 'write' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                        <Icon name={quizMode === 'write' ? 'radio_button_checked' : 'radio_button_unchecked'} />
                                    </div>
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Start Button */}
                    <div className="flex justify-end mt-12">
                        <Button onClick={handleStart} size="lg" className="min-w-[240px]">
                            <span>Bắt đầu học</span>
                            <Icon name="arrow_forward" size="md" />
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
