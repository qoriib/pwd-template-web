"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function RegisterUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role: "USER", password: "temp12345" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Registrasi gagal");
      setInfo(`Registrasi sukses. Token verifikasi: ${data.verifyToken}`);
      setTimeout(() => router.push("/"), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 500 }}>
      <h1 className="h4 mb-3">Registrasi User</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}
      <form onSubmit={handleRegister} className="card p-3 shadow-sm">
        <div className="mb-3">
          <label className="form-label">Nama</label>
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Memproses..." : "Daftar"}
        </button>
        <p className="text-center small mt-3 mb-0">
          Sudah punya akun? <a href="/login-user">Login</a>
        </p>
      </form>
    </div>
  );
}
