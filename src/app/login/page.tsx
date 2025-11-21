"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const getErr = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      localStorage.setItem("role", data.user?.role || "");
      if (data.user?.role === "TENANT") {
        localStorage.setItem("tenantToken", data.token);
        setInfo("Login tenant berhasil, mengalihkan ke dashboard tenant...");
        router.push("/tenant");
      } else {
        localStorage.removeItem("tenantToken");
        setInfo("Login berhasil, mengalihkan ke homepage...");
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <h1 className="h4 mb-3 text-center">Login</h1>
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
    </div>
  );
}
