'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { VocabCard } from '@/components/VocabCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

interface Vocab {
  id: number;
  simplified: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  hskLevel: number;
}

const hskLevels = [
  { level: 1, label: 'Fundamental', color: 'emerald', count: 150 },
  { level: 2, label: 'Elementary', color: 'sky', count: 150 },
  { level: 3, label: 'Intermediate', color: 'amber', count: 300 },
  { level: 4, label: 'Upper Intermediate', color: 'red', count: 600 },
  { level: 5, label: 'Advanced', color: 'purple', count: 1300 },
  { level: 6, label: 'Mastery', color: 'indigo', count: 2500 },
];

const colorClasses: Record<string, { text: string; border: string; bg: string }> = {
  emerald: { text: 'text-emerald-500', border: 'border-emerald-500/20 hover:border-emerald-500', bg: 'group-hover:text-emerald-400' },
  sky: { text: 'text-sky-500', border: 'border-sky-500/20 hover:border-sky-500', bg: 'group-hover:text-sky-400' },
  amber: { text: 'text-amber-500', border: 'border-amber-500/20 hover:border-amber-500', bg: 'group-hover:text-amber-400' },
  red: { text: 'text-red-500', border: 'border-red-500/20 hover:border-red-500', bg: 'group-hover:text-red-400' },
  purple: { text: 'text-purple-500', border: 'border-purple-500/20 hover:border-purple-500', bg: 'group-hover:text-purple-400' },
  indigo: { text: 'text-indigo-500', border: 'border-indigo-500/20 hover:border-indigo-500', bg: 'group-hover:text-indigo-400' },
};

export default function HomePage() {
  const [featuredVocab, setFeaturedVocab] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadVocab = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vocab?limit=6`);
        const data = await res.json();
        setFeaturedVocab(data.data || []);
      } catch (err) {
        console.error('Failed to load vocab:', err);
      } finally {
        setLoading(false);
      }
    };
    loadVocab();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <section className="relative w-full rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center mb-10 bg-gradient-to-br from-[var(--primary)] to-red-600">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-4 text-center gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Trau dồi vốn từ HSK của bạn
              </h2>
              <p className="text-white/80 text-base md:text-lg font-light">
                Học tiếng Trung một cách thông minh với HanXue
              </p>
            </div>
            <div className="w-full max-w-lg mt-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/60">
                  <Icon name="search" />
                </div>
                <input
                  className="block w-full rounded-xl border-none bg-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/50 py-4 pl-12 pr-28 backdrop-blur-sm transition-all text-base"
                  placeholder="Tìm kiếm từ vựng, Pinyin..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                    }
                  }}
                  className="absolute right-2 top-2 bottom-2 bg-white hover:bg-white/90 text-[var(--primary)] font-bold py-1.5 px-4 rounded-lg transition-colors flex items-center cursor-pointer"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-10">
            {/* HSK Levels */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Icon name="school" className="text-[var(--primary)]" />
                  HSK Levels
                </h3>
                <Link href="/vocab" className="text-sm font-medium text-[var(--primary)] hover:underline">
                  Xem tất cả
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {hskLevels.map((hsk) => {
                  const colors = colorClasses[hsk.color];
                  return (
                    <Link key={hsk.level} href={`/vocab?hsk=${hsk.level}`}>
                      <div className={`group relative overflow-hidden rounded-xl bg-[var(--surface)] border ${colors.border} transition-all hover:shadow-lg cursor-pointer p-5 flex flex-col justify-between h-32`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <span className={`text-6xl font-black ${colors.text}`}>{hsk.level}</span>
                        </div>
                        <div>
                          <h4 className={`text-lg font-bold text-[var(--text-main)] ${colors.bg} transition-colors`}>
                            HSK {hsk.level}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">{hsk.label}</p>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-1.5 mt-2">
                          <div className={`${colors.text.replace('text-', 'bg-')} h-1.5 rounded-full`} style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Featured Vocabulary */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Icon name="star" className="text-[var(--primary)]" />
                  Từ vựng nổi bật
                </h3>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 rounded-2xl skeleton"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {featuredVocab.map((vocab) => (
                    <VocabCard
                      key={vocab.id}
                      id={vocab.id}
                      simplified={vocab.simplified}
                      pinyin={vocab.pinyin}
                      hanViet={vocab.hanViet}
                      meaningVi={vocab.meaningVi}
                      hskLevel={vocab.hskLevel}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-80 flex flex-col gap-6">
            {/* Daily Streak */}
            <Card hover={false} className="text-center">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[var(--text-main)]">Daily Streak</h4>
                <Icon name="local_fire_department" className="text-orange-500" />
              </div>
              <div className="py-4">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  0
                </span>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">Days in a row</p>
              </div>
            </Card>

            {/* Quick Practice */}
            <Card hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[var(--text-main)]">Luyện tập nhanh</h4>
                <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded">
                  XP
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Học 10 từ mới mỗi ngày để đạt mục tiêu!
              </p>
              <Link href="/flashcard">
                <Button fullWidth variant="secondary">
                  <Icon name="bolt" size="sm" />
                  Bắt đầu luyện tập
                </Button>
              </Link>
            </Card>

            {/* Word of the Day */}
            <div className="relative bg-gradient-to-br from-[var(--primary)]/90 to-red-600 rounded-2xl p-6 shadow-lg overflow-hidden text-white">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-2">
                Word of the Day
              </h4>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black hanzi">好</div>
                <div>
                  <p className="font-bold text-lg">Hǎo</p>
                  <p className="text-sm text-white/90">Good / Tốt</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
