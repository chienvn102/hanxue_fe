'use client';

import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (err: Error) => void;
}

interface State {
    err: Error | null;
}

/**
 * Error boundary nhẹ — bọc 1 phần UI để crash ở đó không kill cả trang.
 * Dùng cho danh sách render từng item (vd: question card trong HSK answers page),
 * khi item nào có data thiếu sẽ rơi vào fallback thay vì crash toàn page.
 */
export class SafeRender extends Component<Props, State> {
    state: State = { err: null };

    static getDerivedStateFromError(err: Error): State {
        return { err };
    }

    componentDidCatch(err: Error) {
        this.props.onError?.(err);
        if (process.env.NODE_ENV !== 'production') {
            console.error('[SafeRender] caught:', err);
        }
    }

    render() {
        if (this.state.err) {
            return this.props.fallback ?? (
                <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    Không hiển thị được nội dung này.
                </div>
            );
        }
        return this.props.children;
    }
}

export default SafeRender;
