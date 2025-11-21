"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const getErr = (err: unknown) => (err instanceof Error ? err.message : String(err));

type BookingStatus =
  | "WAITING_PAYMENT"
  | "WAITING_CONFIRMATION"
  | "PROCESSING"
  | "CANCELLED"
  | "COMPLETED";

type TenantOrder = {
  id: number;
  status: BookingStatus;
  totalAmount: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  property: { name: string } | null;
  room: { name: string } | null;
  user: { name: string; email: string } | null;
  paymentProof: { fileUrl: string | null; verifiedAt: string | null } | null;
};

export default function TenantDashboardPage() {
  const [token, setToken] = useState<string>("");
  const [orders, setOrders] = useState<TenantOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  useEffect(() => {
    const savedToken =
      typeof window !== "undefined" ? localStorage.getItem("tenantToken") : null;
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`${API_BASE}/tenant/orders?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat pesanan tenant.");
      setOrders(data.data || []);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  const logoutTenant = () => {
    localStorage.removeItem("tenantToken");
    setToken("");
    setOrders([]);
    setInfo("Logout tenant berhasil.");
  };

  const handleConfirm = async (
    bookingId: number,
    action: "approve" | "reject"
  ) => {
    if (!token) return;
    if (action === "reject" && !window.confirm("Tolak bukti pembayaran ini?")) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/tenant/orders/${bookingId}/confirm`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memproses aksi.");
      setInfo(`Booking #${bookingId} ${action === "approve" ? "disetujui" : "ditolak"}.`);
      fetchOrders();
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!token) return;
    if (!window.confirm("Batalkan pesanan ini?")) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/tenant/orders/${bookingId}/cancel`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal membatalkan pesanan.");
      setInfo(`Pesanan #${bookingId} dibatalkan.`);
      fetchOrders();
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReminder = async (bookingId: number) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/tenant/orders/${bookingId}/reminder`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal mengirim pengingat.");
      setInfo(`Pengingat booking #${bookingId} telah dikirim.`);
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h4 mb-1">Tenant Dashboard</h1>
            <p className="text-muted mb-0">Kelola transaksi dan bukti pembayaran penyewa.</p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/" className="btn btn-outline-secondary btn-sm">
              Kembali ke Home
            </Link>
            {token && (
              <button className="btn btn-outline-danger btn-sm" onClick={logoutTenant}>
                Logout Tenant
              </button>
            )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      {!token && (
        <div className="card shadow-sm mb-4" style={{ maxWidth: 480 }}>
          <div className="card-body">
            <h5 className="card-title">Login Tenant</h5>
            <p className="text-muted">
              Silakan login melalui halaman utama login dan gunakan akun tenant.
            </p>
            <Link className="btn btn-primary w-100" href="/login">
              Pergi ke Login
            </Link>
          </div>
        </div>
      )}

      {token && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
              <div>
                <label className="form-label">Filter status</label>
                <select
                  className="form-select"
                  style={{ minWidth: 220 }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua</option>
                  <option value="WAITING_PAYMENT">Menunggu Pembayaran</option>
                  <option value="WAITING_CONFIRMATION">Menunggu Konfirmasi</option>
                  <option value="PROCESSING">Diproses</option>
                  <option value="CANCELLED">Dibatalkan</option>
                  <option value="COMPLETED">Selesai</option>
                </select>
              </div>
              <div className="ms-auto">
                <button className="btn btn-outline-secondary" onClick={fetchOrders}>
                  Refresh
                </button>
              </div>
            </div>

            {loading && <p className="text-muted">Loading...</p>}
            {!loading && orders.length === 0 && <p className="text-muted">Belum ada pesanan.</p>}

            {!loading &&
              orders.map((order) => (
                <div className="border rounded p-3 mb-3" key={order.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h5 className="mb-1">
                        #{order.id} - {order.property?.name} / {order.room?.name}
                      </h5>
                      <div className="text-muted small">
                        {new Date(order.checkIn).toLocaleDateString()} →{" "}
                        {new Date(order.checkOut).toLocaleDateString()} | {order.guests} tamu
                      </div>
                      <div className="text-muted small">
                        Penyewa: {order.user?.name} ({order.user?.email})
                      </div>
                      <div className="text-muted small">
                        Bukti bayar: {order.paymentProof ? order.paymentProof.fileUrl?.split("/").pop() : "Belum ada"}
                      </div>
                    </div>
                    <span className="badge bg-primary">{order.status}</span>
                  </div>

                  <div className="mt-3 d-flex flex-wrap gap-2">
                    {order.status === "WAITING_CONFIRMATION" && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleConfirm(order.id, "approve")}>
                          Setujui
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleConfirm(order.id, "reject")}>
                          Tolak
                        </button>
                      </>
                    )}
                    {order.status === "WAITING_PAYMENT" && !order.paymentProof && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleCancel(order.id)}>
                        Batalkan Pesanan
                      </button>
                    )}
                    {order.status === "PROCESSING" && (
                      <button className="btn btn-outline-primary btn-sm" onClick={() => handleReminder(order.id)}>
                        Kirim Pengingat
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="text-muted small">
                  Halaman {page} dari {pagination.totalPages}
                </span>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Prev
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
