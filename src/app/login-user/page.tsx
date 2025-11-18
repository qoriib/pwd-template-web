"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function LoginUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dina.traveler@test.com");
  const [password, setPassword] = useState("user12345");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login gagal");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", String(data.user?.id));
      setInfo("Login sukses. Mengalihkan ke homepage...");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="h4 mb-3">Login User</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}
      <form onSubmit={handleLogin} className="card p-3 shadow-sm">
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            className="form-control"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Memproses..." : "Login"}
        </button>
        <p className="text-center small mt-3 mb-0">
          Belum punya akun? <a href="/register-user">Daftar User</a>
        </p>
      </form>
    </div>
  );
}
