export default function AdminPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola karyawan, pagu, whitelist policy, dan kendaraan</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
        <div className="text-4xl mb-3">⚙️</div>
        <p className="font-medium">Panel Admin akan dikembangkan lebih lanjut</p>
        <p className="text-sm mt-1">Sementara gunakan database langsung untuk mengelola data master</p>
      </div>
    </div>
  );
}
