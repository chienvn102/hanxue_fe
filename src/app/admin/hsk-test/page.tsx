'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const HSK_COLORS: Record<number, string> = {
    1: 'bg-green-500', 2: 'bg-teal-500', 3: 'bg-blue-500',
    4: 'bg-purple-500', 5: 'bg-orange-500', 6: 'bg-red-500'
};

const EXAM_TYPES = [
    { value: 'practice', label: 'Luyện tập' },
    { value: 'mock', label: 'Đề mẫu' },
    { value: 'official', label: 'Đề chính thức' }
];

const SECTION_TYPES = [
    { value: 'listening', label: 'Nghe hiểu' },
    { value: 'reading', label: 'Đọc hiểu' },
    { value: 'writing', label: 'Viết' }
];

const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Trắc nghiệm (A/B/C/D)' },
    { value: 'true_false', label: 'Đúng/Sai' },
    { value: 'image_match', label: 'Ghép ảnh' },
    { value: 'fill_blank', label: 'Điền vào chỗ trống' },
    { value: 'sentence_order', label: 'Sắp xếp câu' },
    { value: 'error_identify', label: 'Tìm câu sai' },
    { value: 'short_answer', label: 'Viết ngắn' }
];

interface Exam {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: string;
    total_questions: number;
    duration_minutes: number;
    passing_score: number;
    description: string;
    is_active: boolean;
}

interface Section {
    id: number;
    exam_id: number;
    section_type: string;
    section_order: number;
    title: string;
    instructions: string;
    total_questions: number;
    duration_seconds: number;
    audio_url: string;
    questions?: Question[];
}

interface Question {
    id: number;
    section_id: number;
    question_number: number;
    question_type: string;
    question_text: string;
    question_image: string;
    question_audio: string;
    audio_start_time: number;
    audio_end_time: number;
    options: string[];
    correct_answer: string;
    explanation: string;
}

export default function HskExamAdminPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [hskFilter, setHskFilter] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [showExamModal, setShowExamModal] = useState(false);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);

    // Selected items
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [expandedExam, setExpandedExam] = useState<number | null>(null);
    const [examSections, setExamSections] = useState<Section[]>([]);

    // Form data
    const [examForm, setExamForm] = useState({
        title: '', hsk_level: 1, exam_type: 'practice',
        duration_minutes: 60, passing_score: 120, description: ''
    });
    const [sectionForm, setSectionForm] = useState({
        section_type: 'listening', section_order: 1, title: '',
        instructions: '', duration_seconds: 0, audio_url: ''
    });
    const [questionForm, setQuestionForm] = useState({
        question_number: 1, question_type: 'multiple_choice',
        question_text: '', question_image: '', question_audio: '',
        audio_start_time: 0, audio_end_time: 0,
        options: ['', '', '', ''], correct_answer: '', explanation: ''
    });

    const fetchExams = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            let url = `${API_BASE}/api/hsk-exams?limit=100`;
            if (hskFilter) url += `&hsk=${hskFilter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setExams(data.data || []);
        } catch (err) {
            console.error('Failed to fetch exams:', err);
        } finally {
            setLoading(false);
        }
    }, [hskFilter]);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const fetchExamDetail = async (examId: number) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setExamSections(data.sections || []);
        } catch (err) {
            console.error('Failed to fetch exam detail:', err);
        }
    };

    const toggleExpandExam = (examId: number) => {
        if (expandedExam === examId) {
            setExpandedExam(null);
            setExamSections([]);
        } else {
            setExpandedExam(examId);
            fetchExamDetail(examId);
        }
    };

    // EXAM CRUD
    const openCreateExamModal = () => {
        setSelectedExam(null);
        setExamForm({ title: '', hsk_level: 1, exam_type: 'practice', duration_minutes: 60, passing_score: 120, description: '' });
        setShowExamModal(true);
    };

    const openEditExamModal = (exam: Exam) => {
        setSelectedExam(exam);
        setExamForm({
            title: exam.title, hsk_level: exam.hsk_level, exam_type: exam.exam_type,
            duration_minutes: exam.duration_minutes, passing_score: exam.passing_score,
            description: exam.description || ''
        });
        setShowExamModal(true);
    };

    const handleSaveExam = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const method = selectedExam ? 'PUT' : 'POST';
            const url = selectedExam ? `${API_BASE}/api/hsk-exams/${selectedExam.id}` : `${API_BASE}/api/hsk-exams`;

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(examForm)
            });
            setShowExamModal(false);
            fetchExams();
        } catch (err) {
            console.error('Failed to save exam:', err);
            alert('Lỗi khi lưu đề thi');
        }
    };

    const handleDeleteExam = async (id: number) => {
        if (!confirm('Xóa đề thi này? Tất cả câu hỏi sẽ bị xóa.')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_BASE}/api/hsk-exams/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchExams();
        } catch (err) {
            console.error('Failed to delete exam:', err);
        }
    };

    // SECTION CRUD
    const openCreateSectionModal = (exam: Exam) => {
        setSelectedExam(exam);
        setSelectedSection(null);
        const nextOrder = examSections.length + 1;
        setSectionForm({ section_type: 'listening', section_order: nextOrder, title: '', instructions: '', duration_seconds: 0, audio_url: '' });
        setShowSectionModal(true);
    };

    const openEditSectionModal = (section: Section) => {
        setSelectedSection(section);
        setSectionForm({
            section_type: section.section_type, section_order: section.section_order,
            title: section.title || '', instructions: section.instructions || '',
            duration_seconds: section.duration_seconds, audio_url: section.audio_url || ''
        });
        setShowSectionModal(true);
    };

    const handleSaveSection = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const method = selectedSection ? 'PUT' : 'POST';
            const url = selectedSection
                ? `${API_BASE}/api/hsk-exams/sections/${selectedSection.id}`
                : `${API_BASE}/api/hsk-exams/${selectedExam?.id}/sections`;

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(sectionForm)
            });
            setShowSectionModal(false);
            if (expandedExam) fetchExamDetail(expandedExam);
        } catch (err) {
            console.error('Failed to save section:', err);
            alert('Lỗi khi lưu phần thi');
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Xóa phần thi này?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_BASE}/api/hsk-exams/sections/${sectionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (expandedExam) fetchExamDetail(expandedExam);
        } catch (err) {
            console.error('Failed to delete section:', err);
        }
    };

    // QUESTION CRUD
    const openCreateQuestionModal = (section: Section) => {
        setSelectedSection(section);
        const nextNumber = (section.questions?.length || 0) + 1;
        setQuestionForm({
            question_number: nextNumber, question_type: 'multiple_choice',
            question_text: '', question_image: '', question_audio: '',
            audio_start_time: 0, audio_end_time: 0,
            options: ['', '', '', ''], correct_answer: '', explanation: ''
        });
        setShowQuestionModal(true);
    };

    const openEditQuestionModal = (question: Question) => {
        setQuestionForm({
            question_number: question.question_number,
            question_type: question.question_type,
            question_text: question.question_text || '',
            question_image: question.question_image || '',
            question_audio: question.question_audio || '',
            audio_start_time: question.audio_start_time || 0,
            audio_end_time: question.audio_end_time || 0,
            options: question.options || ['', '', '', ''],
            correct_answer: question.correct_answer || '',
            explanation: question.explanation || ''
        });
        setSelectedSection({ ...selectedSection!, id: question.section_id } as Section);
        setShowQuestionModal(true);
    };

    const handleSaveQuestion = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const url = `${API_BASE}/api/hsk-exams/sections/${selectedSection?.id}/questions`;

            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(questionForm)
            });
            setShowQuestionModal(false);
            if (expandedExam) fetchExamDetail(expandedExam);
        } catch (err) {
            console.error('Failed to save question:', err);
            alert('Lỗi khi lưu câu hỏi');
        }
    };

    const handleDeleteQuestion = async (questionId: number) => {
        if (!confirm('Xóa câu hỏi này?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_BASE}/api/hsk-exams/questions/${questionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (expandedExam) fetchExamDetail(expandedExam);
        } catch (err) {
            console.error('Failed to delete question:', err);
        }
    };

    const filteredExams = exams.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Quản lý Đề thi HSK</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Tổng cộng {exams.length} đề thi</p>
                </div>
                <Button onClick={openCreateExamModal}>
                    <Icon name="add" size="sm" className="mr-1" /> Tạo Đề thi
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-4 mb-6">
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Tìm kiếm đề thi..."
                        className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div className="flex gap-1">
                        <button
                            onClick={() => setHskFilter(null)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!hskFilter ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                        >
                            Tất cả
                        </button>
                        {[1, 2, 3, 4, 5, 6].map(level => (
                            <button
                                key={level}
                                onClick={() => setHskFilter(level)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hskFilter === level ? `${HSK_COLORS[level]} text-white` : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                            >
                                HSK {level}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Exams List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">Đang tải...</div>
                ) : filteredExams.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">Chưa có đề thi nào</div>
                ) : filteredExams.map(exam => (
                    <div key={exam.id} className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
                        {/* Exam Header */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleExpandExam(exam.id)}
                                    className="p-1 hover:bg-[var(--surface-secondary)] rounded transition-colors"
                                >
                                    <Icon name={expandedExam === exam.id ? "expand_more" : "chevron_right"} />
                                </button>
                                <span className={`${HSK_COLORS[exam.hsk_level]} text-white text-xs font-bold px-2 py-1 rounded`}>
                                    HSK {exam.hsk_level}
                                </span>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-main)]">{exam.title}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {exam.total_questions} câu • {exam.duration_minutes} phút • Đạt: {exam.passing_score}đ
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${exam.is_active ? 'bg-green-500/10 text-green-500' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}>
                                    {exam.is_active ? 'Đang hoạt động' : 'Tắt'}
                                </span>
                                <button onClick={() => openEditExamModal(exam)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-400">
                                    <Icon name="edit" size="sm" />
                                </button>
                                <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500">
                                    <Icon name="delete" size="sm" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Sections */}
                        {expandedExam === exam.id && (
                            <div className="border-t border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-medium text-[var(--text-secondary)]">Phần thi ({examSections.length})</h4>
                                    <Button variant="outline" size="sm" onClick={() => openCreateSectionModal(exam)}>
                                        <Icon name="add" size="sm" className="mr-1" /> Thêm phần
                                    </Button>
                                </div>

                                {examSections.length === 0 ? (
                                    <p className="text-sm text-[var(--text-muted)] text-center py-4">Chưa có phần thi nào</p>
                                ) : examSections.map(section => (
                                    <div key={section.id} className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 mb-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-500/10 text-blue-500 text-xs font-medium px-2 py-0.5 rounded">
                                                    {SECTION_TYPES.find(t => t.value === section.section_type)?.label}
                                                </span>
                                                <span className="font-medium text-sm">{section.title || `Phần ${section.section_order}`}</span>
                                                <span className="text-xs text-[var(--text-muted)]">({section.total_questions} câu)</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openCreateQuestionModal(section)} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                                                    <Icon name="add_circle" size="sm" />
                                                </button>
                                                <button onClick={() => openEditSectionModal(section)} className="p-1 text-[var(--text-muted)] hover:text-blue-400">
                                                    <Icon name="edit" size="sm" />
                                                </button>
                                                <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-[var(--text-muted)] hover:text-red-500">
                                                    <Icon name="delete" size="sm" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Questions in section */}
                                        {section.questions && section.questions.length > 0 && (
                                            <div className="mt-2 pl-4 border-l-2 border-[var(--border)]">
                                                {section.questions.map(q => (
                                                    <div key={q.id} className="flex items-center justify-between py-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[var(--text-muted)] font-mono w-6">#{q.question_number}</span>
                                                            <span className="text-xs bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded">
                                                                {QUESTION_TYPES.find(t => t.value === q.question_type)?.label?.split(' ')[0]}
                                                            </span>
                                                            <span className="text-[var(--text-secondary)] truncate max-w-[300px]">
                                                                {q.question_text || '(Không có nội dung)'}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <span className="text-xs text-green-500 font-mono">[{q.correct_answer}]</span>
                                                            <button onClick={() => openEditQuestionModal(q)} className="p-0.5 text-[var(--text-muted)] hover:text-blue-400">
                                                                <Icon name="edit" size="sm" />
                                                            </button>
                                                            <button onClick={() => handleDeleteQuestion(q.id)} className="p-0.5 text-[var(--text-muted)] hover:text-red-500">
                                                                <Icon name="delete" size="sm" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Exam Modal */}
            {showExamModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4">{selectedExam ? 'Sửa đề thi' : 'Tạo đề thi mới'}</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Tên đề thi"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={examForm.title}
                                onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="px-3 py-2 border rounded-lg"
                                    value={examForm.hsk_level}
                                    onChange={e => setExamForm({ ...examForm, hsk_level: parseInt(e.target.value) })}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>HSK {l}</option>)}
                                </select>
                                <select
                                    className="px-3 py-2 border rounded-lg"
                                    value={examForm.exam_type}
                                    onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}
                                >
                                    {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Thời gian (phút)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={examForm.duration_minutes}
                                        onChange={e => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Điểm đạt</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={examForm.passing_score}
                                        onChange={e => setExamForm({ ...examForm, passing_score: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <textarea
                                placeholder="Mô tả"
                                className="w-full px-3 py-2 border rounded-lg"
                                rows={2}
                                value={examForm.description}
                                onChange={e => setExamForm({ ...examForm, description: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowExamModal(false)}>Hủy</Button>
                            <Button onClick={handleSaveExam}>Lưu</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Section Modal */}
            {showSectionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4">{selectedSection ? 'Sửa phần thi' : 'Thêm phần thi'}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="px-3 py-2 border rounded-lg"
                                    value={sectionForm.section_type}
                                    onChange={e => setSectionForm({ ...sectionForm, section_type: e.target.value })}
                                >
                                    {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Thứ tự"
                                    className="px-3 py-2 border rounded-lg"
                                    value={sectionForm.section_order}
                                    onChange={e => setSectionForm({ ...sectionForm, section_order: parseInt(e.target.value) })}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Tiêu đề phần"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={sectionForm.title}
                                onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })}
                            />
                            <textarea
                                placeholder="Hướng dẫn làm bài"
                                className="w-full px-3 py-2 border rounded-lg"
                                rows={3}
                                value={sectionForm.instructions}
                                onChange={e => setSectionForm({ ...sectionForm, instructions: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Thời gian (giây)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={sectionForm.duration_seconds}
                                        onChange={e => setSectionForm({ ...sectionForm, duration_seconds: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Audio URL</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={sectionForm.audio_url}
                                        onChange={e => setSectionForm({ ...sectionForm, audio_url: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowSectionModal(false)}>Hủy</Button>
                            <Button onClick={handleSaveSection}>Lưu</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Modal */}
            {showQuestionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-2xl my-8">
                        <h3 className="text-lg font-bold mb-4">Thêm câu hỏi</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Số câu</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={questionForm.question_number}
                                        onChange={e => setQuestionForm({ ...questionForm, question_number: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-[var(--text-muted)]">Loại câu hỏi</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={questionForm.question_type}
                                        onChange={e => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                                    >
                                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <textarea
                                placeholder="Nội dung câu hỏi"
                                className="w-full px-3 py-2 border rounded-lg"
                                rows={3}
                                value={questionForm.question_text}
                                onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="URL ảnh (nếu có)"
                                    className="px-3 py-2 border rounded-lg"
                                    value={questionForm.question_image}
                                    onChange={e => setQuestionForm({ ...questionForm, question_image: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="URL audio (nếu có)"
                                    className="px-3 py-2 border rounded-lg"
                                    value={questionForm.question_audio}
                                    onChange={e => setQuestionForm({ ...questionForm, question_audio: e.target.value })}
                                />
                            </div>

                            {questionForm.question_type !== 'fill_blank' && questionForm.question_type !== 'short_answer' && (
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-2">Đáp án (A, B, C, D)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                            <input
                                                key={opt}
                                                type="text"
                                                placeholder={`${opt}.`}
                                                className="px-3 py-2 border rounded-lg"
                                                value={questionForm.options[idx] || ''}
                                                onChange={e => {
                                                    const newOpts = [...questionForm.options];
                                                    newOpts[idx] = e.target.value;
                                                    setQuestionForm({ ...questionForm, options: newOpts });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Đáp án đúng</label>
                                    <input
                                        type="text"
                                        placeholder="VD: A, Đúng, 好..."
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={questionForm.correct_answer}
                                        onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)]">Audio timing (giây)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Start"
                                            className="w-1/2 px-3 py-2 border rounded-lg"
                                            value={questionForm.audio_start_time}
                                            onChange={e => setQuestionForm({ ...questionForm, audio_start_time: parseInt(e.target.value) })}
                                        />
                                        <input
                                            type="number"
                                            placeholder="End"
                                            className="w-1/2 px-3 py-2 border rounded-lg"
                                            value={questionForm.audio_end_time}
                                            onChange={e => setQuestionForm({ ...questionForm, audio_end_time: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <textarea
                                placeholder="Giải thích đáp án"
                                className="w-full px-3 py-2 border rounded-lg"
                                rows={2}
                                value={questionForm.explanation}
                                onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowQuestionModal(false)}>Hủy</Button>
                            <Button onClick={handleSaveQuestion}>Lưu câu hỏi</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
