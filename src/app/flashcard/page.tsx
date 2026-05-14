'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
    createFlashcardDeck,
    fetchFlashcardDecks,
    type FlashcardDeck,
} from '@/lib/api';

export default function FlashcardPage() {
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [hskLevel, setHskLevel] = useState('1');

    const load = async () => {
        setLoading(true);
        try {
            setDecks(await fetchFlashcardDecks());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch(console.error);
    }, []);

    const createHskDeck = async () => {
        setCreating(true);
        try {
            await createFlashcardDeck({
                name: `HSK ${hskLevel}`,
                source_type: 'hsk',
                source_ref: hskLevel,
            });
            await load();
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">Flashcard</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Tao bo tu rieng tu HSK, notebook, chu de hoac bai hoc.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={hskLevel}
                            onChange={(e) => setHskLevel(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                        >
                            {[1, 2, 3, 4, 5, 6].map(level => (
                                <option key={level} value={level}>HSK {level}</option>
                            ))}
                        </select>
                        <Button onClick={createHskDeck} disabled={creating}>
                            <Icon name="add" size="sm" className="mr-2" />
                            Tao bo HSK
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
                    </div>
                ) : decks.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                        <Icon name="style" size="lg" className="text-[var(--text-muted)] mb-3" />
                        <p className="text-[var(--text-secondary)]">Chua co bo flashcard. Hay tao nhanh mot bo theo HSK.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {decks.map(deck => (
                            <Link
                                key={deck.id}
                                href={`/flashcard/session?deck=${deck.id}&mode=choice`}
                                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold text-[var(--text-main)]">{deck.name}</h2>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">{deck.source_type}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-[var(--primary)]">{deck.card_count} tu</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
