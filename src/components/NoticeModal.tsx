'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';

interface NoticeModalProps {
  open: boolean;
  onClose: () => void;
}

const slides = [
  {
    src: '/images/defense_2.jpg',
    title: 'Báo cáo Đồ án tốt nghiệp',
    desc: 'đề tài "Xây dựng Website học tiếng Trung" - Hà Nội, năm 2026.',
  },
  {
    src: '/images/defense_1.jpg',
    title: 'Kỷ niệm 212',
    desc: 'ae 212',
  },
];

export default function NoticeModal({ open, onClose }: NoticeModalProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play slides
  useEffect(() => {
    if (!open || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, isHovered]);

  if (!open) return null;

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Decorative top accent border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--primary)] via-red-500 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg">
              <Icon name="campaign" className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">
                Thông Báo Lưu Trữ Hệ Thống
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Hiệu lực từ ngày 01/08/2026</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
            aria-label="Đóng thông báo"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {/* Main Notice text */}
          <div className="space-y-3">
            <p className="text-[var(--text-main)] font-semibold">
              Kính gửi các bạn học viên và người dùng của HanXue,
            </p>
            <p>
              Hệ thống học tiếng Trung HanXue sẽ chính thức NGƯNG HOẠT ĐỘNG CÁC CHỨC NĂNG TƯƠNG TÁC và CHUYỂN SANG TRẠNG THÁI LƯU TRỮ (CHỈ ĐỌC) kể từ ngày <strong className="text-[var(--primary)] font-bold">01/08/2026</strong>.
            </p>
            <p>
              Lý do là vì các dịch vụ bên thứ ba cung cấp API phụ trợ (như nhận dạng giọng nói AI, dịch thuật tự động, phát âm âm thanh và máy chủ cơ sở dữ liệu cloud) ngừng cung cấp gói dịch vụ hoặc ngừng hoạt động.
            </p>
            <p>
              Giao diện của website vẫn sẽ được duy trì hoạt động như một sản phẩm đồ án trưng bày, tuy nhiên các chức năng tương tác cốt lõi như làm bài tập, thi thử HSK, luyện viết chữ động và chat với trợ lý AI sẽ không thể sử dụng được nữa.
            </p>
            <p>
              Chúng tôi xin gửi lời cảm ơn sâu sắc nhất tới tất cả các bạn đã đồng hành, học tập và ủng hộ dự án đồ án tốt nghiệp này trong suốt thời gian qua!
            </p>
          </div>

          {/* Photo Section */}
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-main)] font-bold">
              <Icon name="photo_library" className="text-amber-500 text-sm" />
              <span>Ảnh kỷ niệm Buổi bảo vệ Đồ án tốt nghiệp</span>
            </div>
            
            {/* Carousel Container */}
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/5 group-hover:shadow-md transition-shadow duration-300 border border-[var(--border)]">
              {/* Slides */}
              {slides.map((slide, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-500 ease-in-out flex flex-col ${
                    idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <div className="relative flex-1 bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.src}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Slide text overlay */}
                  <div className="bg-black/75 p-3.5 text-white">
                    <h4 className="font-bold text-sm tracking-tight text-[var(--primary)]">{slide.title}</h4>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">{slide.desc}</p>
                  </div>
                </div>
              ))}

              {/* Navigation Controls */}
              <button
                onClick={prevSlide}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Ảnh trước"
              >
                <Icon name="chevron_left" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Ảnh tiếp theo"
              >
                <Icon name="chevron_right" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute right-3 bottom-16 z-20 flex gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-full">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-200 ${
                      idx === current ? 'bg-[var(--primary)] w-4' : 'bg-white/60 hover:bg-white'
                    }`}
                    aria-label={`Chuyển sang ảnh ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Icon name="school" className="text-sm" />
            <span>Đồ án tốt nghiệp UTT - 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-bold text-sm cursor-pointer shadow-sm hover:shadow transition-all"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
