"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Email o password non corretti.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="loginPage">
      <div className="loginBox">

        <div className="loginLogo">
          <h1>AQUA</h1>
          <span>BAR</span>
        </div>

        <div className="loginLine"></div>

        <p className="loginLabel">GESTIONALE DIPENDENTI</p>

        <h2>Accedi</h2>

        <p className="loginDescription">
          Inserisci le tue credenziali per accedere al gestionale.
        </p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="nome@email.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && (
            <p className="loginError">{message}</p>
          )}

          <button
            className="loginButton"
            type="submit"
            disabled={loading}
          >
            {loading ? "ACCESSO..." : "ACCEDI"}
          </button>

        </form>

        <small className="loginFooter">
          AQUA BAR • FiveM Management
        </small>

      </div>
    </main>
  );
}
