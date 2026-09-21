"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    const email = `${cleanUsername}@aquabar.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      setMessage("Username o password non corretti.");
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

        <p className="loginLabel">
          GESTIONALE DIPENDENTI
        </p>

        <h2>Accedi</h2>

        <p className="loginDescription">
          Inserisci le tue credenziali per accedere al gestionale.
        </p>

        <form onSubmit={handleLogin}>

          <label>Username</label>

          <input
            type="text"
            placeholder="Inserisci username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {message && (
            <p className="loginError">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="loginButton"
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
