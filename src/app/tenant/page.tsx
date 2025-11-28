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
  type SalesRow = {
    propertyId?: number;
    property?: { name?: string };
    userId?: number;
    user?: { name?: string };
    id?: number;
    totalAmount?: number;
    _sum?: { totalAmount?: number };
    _count?: { _all?: number };
    count?: number;
  };
  type AvailabilityData = { properties?: { id: number; name: string; rooms: { id: number; name: string; totalUnits: number; availabilities: { date: string; isAvailable: boolean }[] }[] }[] };
  type ReviewItem = {
    id: number;
    comment: string;
    rating?: number | null;
    tenantReply?: string | null;
    createdAt: string;
    repliedAt?: string | null;
    user: { name: string; email: string } | null;
  };
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [salesGroup, setSalesGroup] = useState<"property" | "user" | "transaction">("property");
  const [salesSort, setSalesSort] = useState<"date" | "total">("total");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyForms, setReplyForms] = useState<Record<number, string>>({});
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

  useEffect(() => {
    if (token) {
      fetchSales();
      fetchAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && selectedPropertyId) {
      fetchReviews(selectedPropertyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedPropertyId]);

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

  const handleComplete = async (bookingId: number) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/tenant/orders/${bookingId}/complete`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal menyelesaikan pesanan.");
      setInfo(`Pesanan #${bookingId} ditandai selesai.`);
      fetchOrders();
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    if (!token) return;
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("groupBy", salesGroup);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`${API_BASE}/tenant/reports/sales?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat laporan");
      let rows: SalesRow[] = data.data || [];
      if (salesSort === "total") {
        rows = [...rows].sort(
          (a, b) => Number((b._sum?.totalAmount ?? b.totalAmount) || 0) - Number((a._sum?.totalAmount ?? a.totalAmount) || 0)
        );
      }
      setSalesData(rows);
    } catch (err: unknown) {
      setError(getErr(err));
    }
  };

  const fetchAvailability = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/tenant/reports/availability`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setAvailability(data.data);
        if (!selectedPropertyId && data.data?.properties?.length) {
          setSelectedPropertyId(data.data.properties[0].id);
        }
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchReviews = async (propertyId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/reviews/property/${propertyId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat review");
      setReviews(data.data || []);
    } catch (err: unknown) {
      setError(getErr(err));
    }
  };

  const submitReply = async (reviewId: number) => {
    if (!token) return;
    const reply = replyForms[reviewId];
    if (!reply) return setError("Balasan tidak boleh kosong");
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal mengirim balasan");
      setInfo("Balasan dikirim.");
      setReplyForms((prev) => ({ ...prev, [reviewId]: "" }));
      if (selectedPropertyId) fetchReviews(selectedPropertyId);
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
        <div className="card shadow-sm mb-4">
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
                      <button className="btn btn-outline-success btn-sm" onClick={() => handleComplete(order.id)}>
                        Tandai Completed
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

      {token && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title mb-3">Laporan Penjualan</h5>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <label className="form-label">Group by</label>
                <select
                  className="form-select"
                  value={salesGroup}
                  onChange={(e) => setSalesGroup(e.target.value as "property" | "user" | "transaction")}
                >
                  <option value="property">Property</option>
                  <option value="user">User</option>
                  <option value="transaction">Transaction</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Dari tanggal</label>
                <input className="form-control" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Sampai tanggal</label>
                <input className="form-control" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="col-md-3 d-flex align-items-end gap-2">
                <button className="btn btn-primary" onClick={fetchSales}>
                  Muat Laporan
                </button>
              </div>
              <div className="col-md-3">
                <label className="form-label">Urutkan</label>
                <select className="form-select" value={salesSort} onChange={(e) => setSalesSort(e.target.value as "date" | "total")}>
                  <option value="total">Total penjualan (desc)</option>
                  <option value="date">Tanggal (desc)</option>
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    {salesGroup === "property" && <th>Property</th>}
                    {salesGroup === "user" && <th>User</th>}
                    {salesGroup === "transaction" && <th>Transaksi</th>}
                    <th>Total</th>
                    <th>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((row: SalesRow, idx: number) => {
                    const total = Number(row._sum?.totalAmount ?? row.totalAmount ?? 0);
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        {salesGroup === "property" && <td>{row.property?.name || row.propertyId}</td>}
                        {salesGroup === "user" && <td>{row.user?.name || row.userId}</td>}
                        {salesGroup === "transaction" && (
                          <td>
                            #{row.id} - {row.property?.name}
                          </td>
                        )}
                        <td>Rp {total.toLocaleString("id-ID")}</td>
                        <td>{row.count ?? row._count?._all ?? (salesGroup === "transaction" ? 1 : 0)}</td>
                      </tr>
                    );
                  })}
                  {salesData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted">
                        Belum ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h6 className="mt-4">Review & Balasan</h6>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label">Property</label>
                <select
                  className="form-select"
                  value={selectedPropertyId ?? ""}
                  onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                >
                  {availability?.properties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-outline-secondary" onClick={() => selectedPropertyId && fetchReviews(selectedPropertyId)}>
                  Refresh
                </button>
              </div>
            </div>
            {reviews.length === 0 && <p className="text-muted">Belum ada review untuk properti ini.</p>}
            {reviews.map((rev) => (
              <div key={rev.id} className="border rounded p-3 mb-2">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>{rev.user?.name || "User"}</strong> {rev.rating ? `· ${rev.rating}/5` : ""}
                    <div className="text-muted small">{new Date(rev.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className="badge bg-info text-dark">Review #{rev.id}</span>
                </div>
                <p className="mb-2">{rev.comment}</p>
                {rev.tenantReply ? (
                  <div className="alert alert-secondary py-2 mb-2">
                    <div className="fw-semibold mb-1">Balasan tenant</div>
                    <div>{rev.tenantReply}</div>
                    {rev.repliedAt && <div className="text-muted small mt-1">Pada {new Date(rev.repliedAt).toLocaleDateString()}</div>}
                  </div>
                ) : (
                  <form
                    className="d-flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitReply(rev.id);
                    }}
                  >
                    <input
                      className="form-control"
                      placeholder="Balasan tenant..."
                      value={replyForms[rev.id] || ""}
                      onChange={(e) => setReplyForms((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                    />
                    <button className="btn btn-outline-primary" disabled={loading}>
                      Kirim
                    </button>
                  </form>
                )}
              </div>
            ))}
            <h6 className="mt-4">Property Availability (30 hari)</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Room</th>
                    <th>Total Units</th>
                    <th>Availability Overrides</th>
                  </tr>
                </thead>
                <tbody>
                  {availability?.properties?.map((p) =>
                    p.rooms.map((r) => (
                      <tr key={`${p.id}-${r.id}`}>
                        <td>{p.name}</td>
                        <td>{r.name}</td>
                        <td>{r.totalUnits}</td>
                        <td>
                          {r.availabilities?.length
                            ? r.availabilities
                                .slice(0, 5)
                                .map((a) => `${new Date(a.date).toLocaleDateString()} (${a.isAvailable ? "open" : "closed"})`)
                                .join(", ")
                            : "default available"}
                        </td>
                      </tr>
                    ))
                  )}
                  {!availability && (
                    <tr>
                      <td colSpan={4} className="text-muted">
                        Belum ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
