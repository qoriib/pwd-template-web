"use client";

import { useEffect, useMemo, useState } from "react";

type BookingStatus =
  | "WAITING_PAYMENT"
  | "WAITING_CONFIRMATION"
  | "PROCESSING"
  | "CANCELLED"
  | "COMPLETED";

type Booking = {
  id: number;
  property: { name: string };
  room: { name: string };
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: string;
  paymentProof?: { fileUrl: string | null };
};

type Property = {
  id: number;
  name: string;
  city: string;
  category?: { name: string };
  images?: { url: string; isPrimary: boolean }[];
  rooms?: { id: number; basePrice: string }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const getErrMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<number, File | null>>({});
  const [filter, setFilter] = useState({ city: "", checkIn: "", checkOut: "", duration: "1" });
  const [bookingForm, setBookingForm] = useState({
    propertyId: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
  });

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  const fetchDestinations = async () => {
    const res = await fetch(`${API_BASE}/properties/destinations`);
    const data = await res.json();
    if (res.ok) setDestinations(data.cities || []);
  };

  const fetchProperties = async (city?: string) => {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const res = await fetch(`${API_BASE}/properties${query}`);
    const data = await res.json();
    if (res.ok) setProperties(data.data || []);
  };

  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/bookings?page=1&pageSize=20`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat pesanan");
      setBookings(data.data || []);
    } catch (err: unknown) {
      setError(getErrMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
    fetchProperties();
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const storedUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (storedToken) setToken(storedToken);
    if (storedUserId) setUserId(Number(storedUserId));
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    setToken("");
    setUserId(null);
    setInfo("Berhasil logout.");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setError("Login terlebih dahulu untuk reservasi.");
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const payload = {
        propertyId: Number(bookingForm.propertyId),
        roomId: Number(bookingForm.roomId),
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        guests: Number(bookingForm.guests),
      };
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal membuat pesanan");
      setInfo("Pesanan berhasil dibuat.");
      await fetchBookings();
    } catch (err: unknown) {
      setError(getErrMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (bookingId: number) => {
    const file = proofFiles[bookingId];
    if (!file) {
      setError("Pilih file bukti bayar (.jpg/.png, max 1MB).");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/payment-proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal upload bukti bayar");
      setInfo("Bukti bayar berhasil diupload.");
      setProofFiles((prev) => ({ ...prev, [bookingId]: null }));
      await fetchBookings();
    } catch (err: unknown) {
      setError(getErrMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal membatalkan pesanan");
      setInfo("Pesanan dibatalkan.");
      await fetchBookings();
    } catch (err: unknown) {
      setError(getErrMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties =
    filter.city && filter.city.length > 0
      ? properties.filter((p) => p.city === filter.city)
      : properties;

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#">
            StayHub
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-2">
              <li className="nav-item">
                <a className="nav-link" href="#home">
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#properties">
                  Properties
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#transactions">
                  Transactions
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/profile">
                  Profile
                </a>
              </li>
              <li className="nav-item d-flex gap-2">
                {token ? (
                  <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                ) : (
                  <>
                    <a className="btn btn-outline-primary btn-sm" href="/login-user">
                      Login
                    </a>
                    <a className="btn btn-primary btn-sm" href="/register-user">
                      Register
                    </a>
                  </>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <header id="home" className="bg-light pb-5">
        <div className="container mt-4">
          <div className="row g-4">
            <div className="col-lg-8">
              <div
                className="hero-overlay h-100 d-flex flex-column justify-content-center"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, rgba(13,110,253,0.9), rgba(99,130,255,0.8)), url('https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="pill mb-2">Cari & bandingkan</span>
                <h1 className="fw-bold mb-2">Temukan penginapan terbaik dengan harga transparan</h1>
                <p className="mb-3">
                  Pilih destinasi, atur tanggal, dan lihat ketersediaan kamar dengan harga yang sudah menyesuaikan hari
                  libur & peak season.
                </p>
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label text-white-50">Destinasi</label>
                    <select
                      className="form-select"
                      value={filter.city}
                      onChange={(e) => {
                        setFilter({ ...filter, city: e.target.value });
                        fetchProperties(e.target.value || undefined);
                      }}
                    >
                      <option value="">Pilih kota</option>
                      {destinations.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-white-50">Check-in</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filter.checkIn}
                      onChange={(e) => setFilter({ ...filter, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label text-white-50">Durasi</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={filter.duration}
                      onChange={(e) => setFilter({ ...filter, duration: e.target.value })}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label text-white-50">Check-out</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filter.checkOut}
                      onChange={(e) => setFilter({ ...filter, checkOut: e.target.value })}
                    />
                  </div>
                  <div className="col-md-1 d-flex align-items-end">
                    <button
                      className="btn btn-light w-100"
                      type="button"
                      onClick={() => fetchProperties(filter.city || undefined)}
                    >
                      Cari
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="card shadow-sm h-100"
                style={{
                  background:
                    "linear-gradient(140deg, rgba(255,255,255,0.95), rgba(230,236,255,0.9))",
                }}
              >
                <div className="card-body">
                  <h6 className="card-title d-flex justify-content-between align-items-center">
                    Masuk
                    <span className="badge bg-primary">User</span>
                  </h6>
                  <p className="text-muted small mb-3">Masuk untuk melanjutkan reservasi.</p>
                  <a className="btn btn-primary w-100" href="/login-user">
                    Login User
                  </a>
                  <hr />
                  <h6 className="card-title">Belum punya akun?</h6>
                  <a className="btn btn-outline-primary w-100" href="/register-user">
                    Daftar User
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-5" id="properties">
        {(error || info) && (
          <div className={`alert ${error ? "alert-danger" : "alert-success"}`} role="alert">
            {error || info}
          </div>
        )}

        <h2 className="h4 mb-3">Property tersedia</h2>
        <div className="row g-4">
          {filteredProperties.map((p) => (
            <div className="col-md-4" key={p.id}>
              <div className="card h-100 shadow-sm">
                <div
                  style={{
                    height: 180,
                    backgroundImage: `url(${p.images?.find((img) => img.isPrimary)?.url || "/placeholder.png"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="card-body">
                  <h5 className="card-title">{p.name}</h5>
                  <p className="card-text text-muted mb-1">
                    {p.city} · {p.category?.name || "Kategori"}
                  </p>
                  <p className="fw-semibold">
                    Mulai dari Rp{" "}
                    {p.rooms && p.rooms.length
                      ? Number(p.rooms[0].basePrice).toLocaleString("id-ID")
                      : "N/A"}
                  </p>
                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        setBookingForm((prev) => ({
                          ...prev,
                          propertyId: String(p.id),
                          roomId: p.rooms && p.rooms.length ? String(p.rooms[0].id) : "",
                        }))
                      }
                    >
                      Pilih
                    </button>
                    <small className="text-muted">Room: {p.rooms?.length || 0}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProperties.length === 0 && <p className="text-muted">Tidak ada property untuk filter ini.</p>}
        </div>
      </main>

      <section className="bg-light py-5" id="transactions">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h3 className="h4 mb-1 section-title">Transaksi Penginapan</h3>
              <p className="mb-0 section-subtitle">Reservasi, upload bukti bayar, dan riwayat pesanan.</p>
            </div>
            <div className="text-muted small">{userId ? `User ID: ${userId}` : "Login untuk memulai"}</div>
          </div>
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Buat Pesanan</h5>
                  <form onSubmit={handleCreate}>
                    <div className="mb-2">
                      <label className="form-label">Property ID</label>
                      <input
                        className="form-control"
                        value={bookingForm.propertyId}
                        onChange={(e) => setBookingForm({ ...bookingForm, propertyId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Room ID</label>
                      <input
                        className="form-control"
                        value={bookingForm.roomId}
                        onChange={(e) => setBookingForm({ ...bookingForm, roomId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Check-in</label>
                      <input
                        type="date"
                        className="form-control"
                        value={bookingForm.checkIn}
                        onChange={(e) => setBookingForm({ ...bookingForm, checkIn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Check-out</label>
                      <input
                        type="date"
                        className="form-control"
                        value={bookingForm.checkOut}
                        onChange={(e) => setBookingForm({ ...bookingForm, checkOut: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Guests</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={bookingForm.guests}
                        onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={loading || !token}>
                      {loading ? "Memproses..." : "Buat Pesanan"}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="card-title mb-0">Riwayat Pesanan</h5>
                    <button className="btn btn-outline-secondary btn-sm" onClick={fetchBookings} disabled={loading}>
                      Refresh
                    </button>
                  </div>

                  {loading && <p className="text-muted">Memuat...</p>}
                  {!loading && bookings.length === 0 && <p className="text-muted">Belum ada pesanan.</p>}

                  {!loading &&
                    bookings.map((b) => (
                      <div key={b.id} className="border rounded p-3 mb-3">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h6 className="mb-1">
                              #{b.id} - {b.property?.name} / {b.room?.name}
                            </h6>
                            <div className="text-muted small">
                              {new Date(b.checkIn).toLocaleDateString()} →{" "}
                              {new Date(b.checkOut).toLocaleDateString()} | {b.guests} tamu
                            </div>
                            <div className="text-muted small">
                              Total: Rp {Number(b.totalAmount).toLocaleString("id-ID")}
                            </div>
                          </div>
                          <span className="badge bg-primary align-self-start">{b.status}</span>
                        </div>

                        <div className="mt-3 d-flex flex-wrap gap-2">
                          <div className="input-group" style={{ maxWidth: 320 }}>
                            <input
                              type="file"
                              className="form-control"
                              accept=".jpg,.jpeg,.png"
                              onChange={(e) => setProofFiles({ ...proofFiles, [b.id]: e.target.files?.[0] || null })}
                            />
                            <button
                              className="btn btn-success"
                              disabled={loading || b.status !== "WAITING_PAYMENT"}
                              onClick={() => handleProofUpload(b.id)}
                            >
                              Upload Bukti
                            </button>
                          </div>

                          <button
                            className="btn btn-outline-danger"
                            disabled={loading || b.status !== "WAITING_PAYMENT"}
                            onClick={() => handleCancel(b.id)}
                          >
                            Batalkan
                          </button>

                          {b.paymentProof && (
                            <span className="badge bg-success text-wrap">
                              Bukti: {b.paymentProof.fileUrl?.split("/").pop()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-1">StayHub</h6>
            <small>Temukan dan kelola penginapan terbaik Anda.</small>
          </div>
          <div className="d-flex gap-3 small">
            <span>FAQ</span>
            <span>Support</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </>
  );
}
