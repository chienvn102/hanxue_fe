'use client';

import { useState } from 'react';
import { getMediaUrl } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function uploadFile(file: File, type: 'audio' | 'image'): Promise<string> {
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append(type, file);

    const res = await fetch(`${API_BASE}/api/upload/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    // LƯU ref chuẩn (gs://… ngắn + vĩnh viễn), KHÔNG lưu data.url (signed URL dài >500
    // ký tự → vỡ cột VARCHAR(500) + hết hạn sau 24h). getMediaUrl() tự resolve gs:// khi hiển thị.
    return data.ref || data.url;
}

export function UploadField({ label, value, onChange, type, accept }: {
    label: string; value: string; onChange: (v: string) => void;
    type: 'audio' | 'image'; accept: string;
}) {
    const [uploading, setUploading] = useState(false);

    const doUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadFile(file, type);
            onChange(url);
        } catch {
            alert('Upload thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await doUpload(file);
        e.target.value = '';
    };

    // Dán ảnh từ clipboard (chụp màn hình → Ctrl+V). Chỉ áp cho field ảnh; nếu
    // clipboard không có ảnh thì để paste text (URL) chạy bình thường.
    const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (type !== 'image' || uploading) return;
        const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
        const imgItem = items.find(it => it.kind === 'file' && it.type.startsWith('image/'));
        if (!imgItem) return;
        const file = imgItem.getAsFile();
        if (!file) return;
        e.preventDefault();
        await doUpload(file);
    };

    return (
        <div>
            {label && <label className="text-xs text-[var(--text-muted)] block mb-1">{label}</label>}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={type === 'image' ? 'URL · upload · hoặc dán ảnh (Ctrl+V)' : `URL ${type} (hoặc upload)`}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onPaste={handlePaste}
                />
                <label className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-[var(--surface-secondary)] text-[var(--text-muted)]' : 'bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20'}`}>
                    {uploading ? '...' : <span>&#8593;</span>}
                    <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
                </label>
            </div>
            {value && type === 'image' && (
                // getMediaUrl xử lý gs:// (qua proxy), '/path' (BE host) và http(s).
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getMediaUrl(value)} alt="preview" className="mt-2 max-h-20 rounded border border-[var(--border)] object-contain" />
            )}
            {value && type === 'audio' && (
                <audio src={getMediaUrl(value)} controls className="mt-2 h-8 w-full" />
            )}
        </div>
    );
}
