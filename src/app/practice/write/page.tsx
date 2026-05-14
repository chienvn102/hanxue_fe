'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StrokeWriter, { type StrokeWriterMode } from '@/components/StrokeWriter';
import WriteModeModal from '@/components/WriteModeModal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
    completeWritePractice,
    fetchVocab,
    type Vocabulary,
} from '@/lib/api';

export default function PracticeWritePage() {
    const searchParams = useSearchParams();
    const [words, setWords] = useState<Vocabulary[]>([]);
    const [selectedWordIndex, setSelectedWordIndex] = useState(0);
    const [selectedChar, setSelectedChar] = useState('');
    const [mode, setMode] = useState<StrokeWriterMode>('trace');
    const [modeOpen, setModeOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ completed: 0, mistakes: 0, xp: 0 });

    const selectedWord = words[selectedWordIndex];
    const chars = useMemo(() => Array.from(selectedWord?.simplified || ''), [selectedWord]);

    useEffect(() => {
        const source = searchParams.get('source') || 'hsk';
        const ref = searchParams.get('ref') || '1';
        const hsk = source === 'hsk' ? Math.min(6, Math.max(1, parseInt(ref, 10) || 1)) : 1;

        setLoading(true);
        fetchVocab({ hsk, limit: 12 })
            .then(data => {
                setWords(data.data || []);
                setSelectedWordIndex(0);
                setSelectedChar(data.data?.[0]?.simplified?.[0] || '');
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [searchParams]);

    useEffect(() => {
        setSelectedChar(chars[0] || '');
    }, [chars]);

    const handleComplete = async ({ totalMistakes }: { totalMistakes: number }) => {
        setStats(prev => ({
            ...prev,
            completed: prev.completed + 1,
            mistakes: prev.mistakes + totalMistakes,
        }));
        try {
            const result = await completeWritePractice({ charactersCompleted: 1, totalMistakes });
            setStats(prev => ({ ...prev, xp: prev.xp + (result.xpEarned || 0) }));
        } catch (error) {
            console.error('Record write practice failed:', error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">Luyen viet chu Han</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Chon chu, do net hoac viet tu tri nho.</p>
                    </div>
                    <Button onClick={() => setModeOpen(true)}>
                        <Icon name="edit" size="sm" className="mr-2" />
                        Chon che do
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                    <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <h2 className="font-semibold text-[var(--text-main)] mb-3">Tu dang luyen</h2>
                        {loading ? (
                            <div className="py-8 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {words.map((word, index) => (
                                    <button
                                        key={word.id}
                                        type="button"
                                        onClick={() => setSelectedWordIndex(index)}
                                        className={`w-full text-left p-3 rounded-lg border ${
                                            index === selectedWordIndex
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                : 'border-[var(--border)] hover:bg-[var(--surface-secondary)]'
                                        }`}
                                    >
                                        <div className="text-xl font-bold text-[var(--text-main)]">{word.simplified}</div>
                                        <div className="text-sm text-[var(--text-muted)]">{word.pinyin}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </aside>

                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                        {selectedWord ? (
                            <div className="space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-3xl font-bold text-[var(--text-main)]">{selectedWord.simplified}</div>
                                        <div className="text-[var(--text-secondary)]">{selectedWord.meaningVi}</div>
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">
                                        Hoan thanh {stats.completed} chu · Sai {stats.mistakes} net · +{stats.xp} XP
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {chars.map((char, index) => (
                                        <button
                                            key={`${char}-${index}`}
                                            type="button"
                                            onClick={() => setSelectedChar(char)}
                                            className={`w-14 h-14 rounded-lg border text-2xl font-bold ${
                                                selectedChar === char
                                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                                    : 'border-[var(--border)] text-[var(--text-main)]'
                                            }`}
                                        >
                                            {char}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-center py-4">
                                    <StrokeWriter
                                        character={selectedChar}
                                        mode={mode}
                                        size={280}
                                        onComplete={handleComplete}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-16 text-center text-[var(--text-secondary)]">Khong co tu de luyen.</div>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
            <WriteModeModal
                open={modeOpen}
                value={mode}
                onChange={setMode}
                onClose={() => setModeOpen(false)}
            />
        </div>
    );
}
