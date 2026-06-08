'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ToneTrainerPanel } from './lab/ToneTrainerPanel';
import { ToneMatchPanel } from './lab/ToneMatchPanel';
import { ShadowPanel } from './lab/ShadowPanel';
import { MinimalPairsPanel } from './lab/MinimalPairsPanel';
import { PinyinChartPanel } from './lab/PinyinChartPanel';
import { fetchPronunciationStats, type PronunciationStats } from '@/lib/api';

type LabTab = 'tone-trainer' | 'tone-match' | 'shadow' | 'minimal-pairs' | 'pinyin-chart';

const TABS: { id: LabTab; label: string; icon: string; sub: string }[] = [
    { id: 'tone-trainer',   label: 'Tone',      icon: 'graphic_eq',  sub: 'Vẽ đường cao độ' },
    { id: 'tone-match',     label: 'Đoán tone', icon: 'hearing',     sub: 'Nghe & chọn thanh' },
    { id: 'shadow',         label: 'Shadow',    icon: 'replay',      sub: 'Lặp lại theo native' },
    { id: 'minimal-pairs',  label: 'Cặp âm',    icon: 'compare',     sub: 'Phân biệt âm dễ nhầm' },
    { id: 'pinyin-chart',   label: 'Bảng pinyin', icon: 'grid_on',   sub: 'Tra toàn bộ âm tiết' },
];

export function PronunciationLab() {
    const [tab, setTab] = useState<LabTab>('tone-trainer');
    const [stats, setStats] = useState<PronunciationStats | null>(null);

    useEffect(() => {
        fetchPronunciationStats().then(setStats).catch(() => { /* best-effort */ });
    }, []);

    return (
        <div className="flex flex-col gap-3">
            {/* Header strip with summary */}
            {stats?.overall?.total_syllables !== undefined && (
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Icon name="insights" size="xs" className="text-[var(--primary)]" />
                        <span>Đã luyện <b className="text-[var(--text-main)]">{stats.overall.total_syllables || 0}</b> âm tiết</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span>Thành thạo <b className="text-emerald-600">{stats.overall.mastered || 0}</b></span>
                    </div>
                    <span className="text-[var(--text-muted)]">
                        TB {Math.round(Number(stats.overall.avg_best_score) || 0)}/100
                    </span>
                </div>
            )}

            {/* Sub-tab strip */}
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all ${
                            tab === t.id
                                ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40 text-[var(--primary)]'
                                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Icon name={t.icon} size="xs" />
                            {t.label}
                        </div>
                        <div className="text-[10px] mt-0.5 text-[var(--text-muted)] hidden sm:block">{t.sub}</div>
                    </button>
                ))}
            </div>

            {/* Active panel */}
            <div className="min-h-[400px]">
                {tab === 'tone-trainer'  && <ToneTrainerPanel />}
                {tab === 'tone-match'    && <ToneMatchPanel />}
                {tab === 'shadow'        && <ShadowPanel />}
                {tab === 'minimal-pairs' && <MinimalPairsPanel />}
                {tab === 'pinyin-chart'  && <PinyinChartPanel />}
            </div>
        </div>
    );
}
