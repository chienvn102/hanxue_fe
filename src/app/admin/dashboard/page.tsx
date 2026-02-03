export default function AdminDashboardPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tổng quan</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Tổng thành viên</p>
                    <p className="text-3xl font-bold text-gray-900">1,234</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Khóa học đang mở</p>
                    <p className="text-3xl font-bold text-gray-900">6</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Tổng số bài học</p>
                    <p className="text-3xl font-bold text-gray-900">42</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Trạng thái hệ thống</p>
                    <p className="text-green-500 font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        Hoạt động tốt
                    </p>
                </div>
            </div>

            <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Hoạt động gần đây</h2>
                <div className="text-gray-500 text-center py-10">
                    Chưa có hoạt động nào.
                </div>
            </div>
        </div>
    );
}
