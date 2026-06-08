'use client';

/**
 * Shared layout for HSK exam review pages — mirrors the in-exam layout
 * (sticky sub-bar with section tabs / pinyin toggle, sidebar question map,
 * single-question main area, bottom prev/next nav) so the user gets the
 * same mental model whether they're taking the exam or reviewing it.
 *
 * Used by:
 *   - /hsk-test/[examId]/answers (xem đáp án thẳng)
 *   - /hsk-test/result/[attemptId] (xem đáp án sau khi làm bài)
 *
 * Generic over the question type so each page passes its own Q shape:
 *   - answers page: HskAnswerQuestion (correctAnswer + explanation only)
 *   - result page: HskResultQuestion (userAnswer + isCorrect + AI feedback)
 */

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import { useHskTest } from '@/components/hsk-test/HskTestContext';
import type { HskQuestionGroup } from '@/lib/api';

export const SECTION_TYPE_LABELS: Record<string, string> = {
    listening: 'Nghe',
    reading: 'Đọc',
    writing: 'Viết',
};

export interface ReviewSection<Q> {
    id: number;
    section_type: string;
    section_order?: number;
    title?: string;
    instructions?: string;
    audio_url?: string;
    groups?: HskQuestionGroup[];
    questions: Q[];
}

interface BaseQuestion {
    id: number;
    questionNumber: number;
    questionType: string;
    groupId?: number | null;
}

interface FlatQuestion<Q> {
    q: Q;
    sectionIndex: number;
    globalIndex: number;
}

export type NodeStatus = 'current' | 'correct' | 'wrong' | 'unanswered' | 'neutral';

interface Props<Q extends BaseQuestion> {
    /** Exam title shown in sub-bar. */
    title: string;
    hskLevel: number;
    /** Short note next to title, vd "Đáp án & Transcript" / "Kết quả bài làm". */
    subtitle?: string;
    /** Breadcrumb at top of main area. Last item shown as text. */
    breadcrumb: { href?: string; label: string }[];
    sections: ReviewSection<Q>[];
    /** Map node visual state. 'current' is computed automatically. */
    nodeStatus?: (q: Q, globalIndex: number) => NodeStatus;
    /** Render the single-question content area. */
    renderQuestion: (q: Q, info: { questionNumber: number; section: ReviewSection<Q> }) => ReactNode;
    /** Optional content rendered above the sub-bar (vd score card). */
    headerSlot?: ReactNode;
    /** Optional content rendered below the question (vd action buttons). */
    footerSlot?: ReactNode;
}

function PinyinToggle() {
    const { showPinyin, setShowPinyin } = useHskTest();
    return (
        <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                showPinyin
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            }`}
            title="Hiện / ẩn pinyin"
        >
            🅿 Pinyin
        </button>
    );
}

export function ExamReviewShell<Q extends BaseQuestion>({
    title, hskLevel, subtitle, breadcrumb, sections,
    nodeStatus, renderQuestion, headerSlot, footerSlot,
}: Props<Q>) {
    const router = useRouter();

    const flat = useMemo<FlatQuestion<Q>[]>(() => {
        const out: FlatQuestion<Q>[] = [];
        sections.forEach((s, sIdx) => {
            (s.questions || []).forEach(q => out.push({ q, sectionIndex: sIdx, globalIndex: out.length }));
        });
        return out;
    }, [sections]);

    const totalQuestions = flat.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showGrid, setShowGrid] = useState(false);

    useEffect(() => {
        if (currentIndex >= totalQuestions) setCurrentIndex(0);
    }, [totalQuestions, currentIndex]);

    if (totalQuestions === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Icon name="quiz" size="xl" className="text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)]">Đề thi này chưa có câu hỏi.</p>
            </div>
        );
    }

    const current = flat[currentIndex];
    const currentSection = sections[current.sectionIndex];
    const activeSectionIdx = current.sectionIndex;

    const goToSection = (sIdx: number) => {
        const firstInSection = flat.findIndex(f => f.sectionIndex === sIdx);
        if (firstInSection >= 0) setCurrentIndex(firstInSection);
    };

    const statusOf = (q: Q, idx: number): NodeStatus => {
        if (idx === currentIndex) return 'current';
        return nodeStatus ? nodeStatus(q, idx) : 'neutral';
    };

    const nodeClass = (status: NodeStatus) => {
        switch (status) {
            case 'current':
                return 'bg-[var(--primary)] text-white border-[var(--primary)]';
            case 'correct':
                return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/50';
            case 'wrong':
                return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/50';
            case 'unanswered':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40';
            default:
                return 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)]/60';
        }
    };

    return (
        <>
            {headerSlot}

            {/* Sub-bar: title + section tabs + pinyin toggle. Pinned under
                global Header (h-16 sm:h-20). */}
            <div className="sticky top-16 sm:top-20 z-30 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)]">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                            <HSKBadge level={hskLevel} />
                            <h1 className="text-sm sm:text-base font-semibold text-[var(--text-main)] truncate">
                                {title}
                            </h1>
                            {subtitle && (
                                <span className="text-xs text-[var(--text-muted)] hidden sm:inline">· {subtitle}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <PinyinToggle />
                            {/* Mobile-only toggle for question map */}
                            <button
                                onClick={() => setShowGrid(true)}
                                className="md:hidden text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                                title="Mở danh sách câu"
                            >
                                <Icon name="grid_view" size="xs" /> Map
                            </button>
                        </div>
                    </div>
                    {sections.length > 1 && (
                        <div className="flex flex-wrap gap-2 mt-2 -mb-px">
                            {sections.map((s, idx) => (
                                <button
                                    key={s.id}
                                    onClick={() => goToSection(idx)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                        activeSectionIdx === idx
                                            ? 'border-[var(--primary)] text-[var(--primary)]'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                    }`}
                                >
                                    {SECTION_TYPE_LABELS[s.section_type] || s.section_type}{' '}
                                    <span className="text-xs text-[var(--text-muted)]">
                                        ({s.questions?.length || 0})
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main: breadcrumb + (sidebar map + question + bottom nav) */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4 flex-wrap">
                    {breadcrumb.map((b, i) => (
                        <span key={i} className="flex items-center gap-2">
                            {i > 0 && <Icon name="chevron_right" size="xs" />}
                            {b.href && i < breadcrumb.length - 1 ? (
                                <Link href={b.href} className="hover:text-[var(--primary)] transition-colors">{b.label}</Link>
                            ) : (
                                <span className={i === breadcrumb.length - 1 ? 'text-[var(--text-main)]' : ''}>{b.label}</span>
                            )}
                        </span>
                    ))}
                </nav>

                <div className="flex gap-6">
                    {/* Sidebar map */}
                    <aside
                        className={`${
                            showGrid
                                ? 'fixed inset-0 z-40 bg-black/50 md:relative md:bg-transparent md:inset-auto'
                                : 'hidden md:block'
                        } md:flex-shrink-0`}
                    >
                        <div
                            className={`${
                                showGrid ? 'absolute left-0 top-0 bottom-0 w-72' : ''
                            } md:relative md:w-72 lg:w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 overflow-y-auto`}
                            style={{
                                height: showGrid ? '100vh' : 'calc(100vh - 200px)',
                                position: showGrid ? undefined : 'sticky',
                                top: showGrid ? undefined : '160px',
                            }}
                        >
                            {showGrid && (
                                <button
                                    onClick={() => setShowGrid(false)}
                                    className="md:hidden absolute top-3 right-3 p-1 text-[var(--text-muted)]"
                                >
                                    <Icon name="close" size="sm" />
                                </button>
                            )}
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                                Danh sách câu hỏi
                            </h3>
                            <SectionMap
                                sections={sections}
                                flat={flat}
                                currentIndex={currentIndex}
                                statusOf={statusOf}
                                nodeClass={nodeClass}
                                onPick={idx => { setCurrentIndex(idx); setShowGrid(false); }}
                            />
                            {/* Legend */}
                            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1.5 text-[11px] text-[var(--text-muted)]">
                                <LegendRow status="current" label="Câu hiện tại" nodeClass={nodeClass} />
                                {nodeStatus && (
                                    <>
                                        <LegendRow status="correct" label="Trả lời đúng" nodeClass={nodeClass} />
                                        <LegendRow status="wrong" label="Trả lời sai" nodeClass={nodeClass} />
                                        <LegendRow status="unanswered" label="Chưa trả lời" nodeClass={nodeClass} />
                                    </>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Main question area */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex-1">
                            {/* Pill: section + question number */}
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-md ${
                                    currentSection.section_type === 'listening'
                                        ? 'bg-blue-500/10 text-blue-500'
                                        : currentSection.section_type === 'reading'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-purple-500/10 text-purple-500'
                                }`}>
                                    {SECTION_TYPE_LABELS[currentSection.section_type] || currentSection.section_type}
                                </span>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    Câu {currentIndex + 1}/{totalQuestions}
                                </span>
                            </div>

                            {renderQuestion(current.q, {
                                questionNumber: current.q.questionNumber,
                                section: currentSection,
                            })}
                        </div>

                        {/* Bottom nav */}
                        <div className="sticky bottom-0 mt-6 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between py-3">
                                <button
                                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                    disabled={currentIndex === 0}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Icon name="arrow_back" size="xs" />
                                    Câu trước
                                </button>
                                <span className="text-sm text-[var(--text-muted)] hidden sm:block">
                                    {currentIndex + 1} / {totalQuestions}
                                </span>
                                <button
                                    onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
                                    disabled={currentIndex === totalQuestions - 1}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Câu sau
                                    <Icon name="arrow_forward" size="xs" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {footerSlot}
            </main>

            {/* Back button at bottom of breadcrumb area for mobile UX */}
            <button
                onClick={() => router.back()}
                className="hidden"
                aria-hidden
            />
        </>
    );
}

function LegendRow({ status, label, nodeClass }: {
    status: NodeStatus;
    label: string;
    nodeClass: (s: NodeStatus) => string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded border ${nodeClass(status)}`} />
            <span>{label}</span>
        </div>
    );
}

interface SectionMapProps<Q extends BaseQuestion> {
    sections: ReviewSection<Q>[];
    flat: FlatQuestion<Q>[];
    currentIndex: number;
    statusOf: (q: Q, idx: number) => NodeStatus;
    nodeClass: (s: NodeStatus) => string;
    onPick: (globalIndex: number) => void;
}

function SectionMap<Q extends BaseQuestion>({
    sections, flat, statusOf, nodeClass, onPick,
}: SectionMapProps<Q>) {
    return (
        <>
            {sections.map((section, sIdx) => {
                const sectionFlat = flat.filter(f => f.sectionIndex === sIdx);

                // Cluster consecutive questions sharing groupId so the user
                // visually groups related questions (matches exam page).
                const clusters: { groupId: number | null | undefined; items: FlatQuestion<Q>[] }[] = [];
                for (const f of sectionFlat) {
                    const last = clusters[clusters.length - 1];
                    const sameGroup = last && (
                        (!last.groupId && !f.q.groupId) ||
                        (last.groupId && last.groupId === f.q.groupId)
                    );
                    if (sameGroup) last.items.push(f);
                    else clusters.push({ groupId: f.q.groupId, items: [f] });
                }

                const renderNode = (f: FlatQuestion<Q>) => {
                    const status = statusOf(f.q, f.globalIndex);
                    return (
                        <button
                            key={f.q.id}
                            onClick={() => onPick(f.globalIndex)}
                            className={`relative aspect-square min-w-0 rounded border text-[11px] font-medium leading-none flex items-center justify-center transition-all duration-150 ${nodeClass(status)}`}
                            title={`Câu ${f.q.questionNumber}`}
                        >
                            {f.q.questionNumber}
                        </button>
                    );
                };

                return (
                    <div key={section.id} className="mb-4">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                            {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                            {section.title ? `: ${section.title}` : ''}
                        </p>
                        {clusters.map((cluster, cIdx) => {
                            const group = cluster.groupId
                                ? section.groups?.find(g => g.id === cluster.groupId)
                                : null;
                            if (group) {
                                return (
                                    <div
                                        key={cIdx}
                                        className="mb-2 border-l-2 border-purple-400 pl-2 py-1 rounded-r bg-purple-500/5"
                                    >
                                        <p
                                            className="text-[10px] text-purple-600 dark:text-purple-400 italic mb-1 truncate"
                                            title={group.title_vi || group.group_type}
                                        >
                                            🔗 {group.title_vi || group.group_type}
                                        </p>
                                        <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1.5">
                                            {cluster.items.map(renderNode)}
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div key={cIdx} className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1.5 mb-2">
                                    {cluster.items.map(renderNode)}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
}
