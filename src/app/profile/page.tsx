"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const getErr = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  const loadProfile = async () => {
    if (!token) {
      setError("Harus login terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/profile/me`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat profil");
      if (!data.user.isVerified) {
        window.location.href = "/";
        return;
      }
      setUser(data.user);
      setName(data.user.name || "");
      setPhone(data.user.phone || "");
      setEmail(data.user.email || "");
    } catch (err) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/";
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal update profil");
      setInfo("Profil berhasil diperbarui");
      setUser(data.user);
    } catch (err) {
      setError(getErr(err));
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/profile/email`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal update email");
      setInfo(`Email diubah, verifikasi token: ${data.verifyToken}`);
    } catch (err) {
      setError(getErr(err));
    }
  };

  const handleResendVerification = async () => {
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/profile/resend-verification`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal kirim verifikasi");
      setInfo(`Verifikasi dikirim. Token: ${data.verifyToken}`);
    } catch (err) {
      setError(getErr(err));
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/profile/password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal ubah password");
      setInfo("Password diperbarui");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(getErr(err));
    }
  };

  const handleAvatarUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarFile) {
      setError("Pilih file gambar (.jpg, .jpeg, .png, .gif) max 1MB");
      return;
    }
    setInfo(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", avatarFile);
      const res = await fetch(`${API_BASE}/profile/avatar`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal upload avatar");
      setInfo("Avatar diperbarui");
      setUser(data.user);
      setAvatarFile(null);
    } catch (err) {
      setError(getErr(err));
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-1">Profil Saya</h1>
          <p className="text-muted mb-0">Lihat dan perbarui data Anda.</p>
        </div>
        <Link href="/" className="btn btn-outline-secondary btn-sm">
          Kembali ke Home
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      {loading && <p className="text-muted">Memuat...</p>}

      {user && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3 gap-3">
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundImage: `url(${user.avatarUrl || "https://via.placeholder.com/72"})`,
                    }}
                  />
                  <div>
                    <h5 className="mb-1">{user.name}</h5>
                    <div className="text-muted small">#{user.id}</div>
                    <span className={`badge ${user.isVerified ? "bg-success" : "bg-warning text-dark"}`}>
                      {user.isVerified ? "Verified" : "Not Verified"}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="mb-3">
                  <div className="mb-2">
                    <label className="form-label">Nama</label>
                    <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Telepon</label>
                    <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <button className="btn btn-primary">Simpan Profil</button>
                </form>

                <form onSubmit={handleUpdateEmail}>
                  <div className="mb-2">
                    <label className="form-label">Email</label>
                    <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <button className="btn btn-outline-primary w-100">Ubah Email &amp; Kirim Verifikasi</button>
                </form>
                {!user.isVerified && (
                  <button className="btn btn-link mt-2 p-0" onClick={handleResendVerification}>
                    Kirim ulang verifikasi
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h5 className="card-title">Ubah Password</h5>
                <form onSubmit={handleUpdatePassword}>
                  <div className="mb-2">
                    <label className="form-label">Password saat ini</label>
                    <input
                      type="password"
                      className="form-control"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password baru</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-outline-secondary w-100">Ubah Password</button>
                </form>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Upload Foto Profil</h5>
                <form onSubmit={handleAvatarUpload}>
                  <div className="mb-3">
                    <input
                      type="file"
                      className="form-control"
                      accept=".jpg,.jpeg,.png,.gif"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                    <div className="form-text">Max 1MB; jpg, jpeg, png, gif.</div>
                  </div>
                  <button className="btn btn-outline-primary w-100">Upload</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
