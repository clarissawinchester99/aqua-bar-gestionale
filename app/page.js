"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("nome, ruolo")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("Errore profilo:", error);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loadingText">AQUA BAR</div>
      </main>
    );
  }

  return (
    <main>
      <div className="overlay">

        <aside className="sidebar">
          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>
            <button className="active">
              <span className="navIcon">⌂</span>
              Dashboard
            </button>

            <button>
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button>
              <span className="navIcon">◇</span>
              Import
            </button>
          </nav>

          <div className="sidebarBottom">
            <p>Gestionale AQUA BAR</p>
            <small>FiveM Management</small>
          </div>
        </aside>

        <section className="content">

          <header>
            <div>
              <p className="eyebrow">AQUA BAR</p>
              <h2>Dashboard</h2>
              <p className="subtitle">
                Benvenuto nel gestionale del locale
              </p>
            </div>

            <div className="user">
              <div className="avatar">
                {profile?.nome?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="userInfo">
                <strong>
                  {profile?.nome || "Utente"}
                </strong>

                <span>
                  <i className="onlineDot"></i>
                  {profile?.ruolo === "admin"
                    ? "Amministratore"
                    : "Dipendente"}
                </span>
              </div>

              <button
                className="logoutButton"
                onClick={logout}
                title="Esci"
              >
                Esci
              </button>
            </div>
          </header>

          <div className="cards">

            <div className="card">
              <div className="cardIcon">◎</div>

              <div>
                <span>FONDO CASSA</span>
                <h3>$0</h3>
                <p>Conto aziendale AQUA BAR</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">♙</div>

              <div>
                <span>FATTURATO PERSONALE</span>
                <h3>$0</h3>
                <p>Il tuo fatturato totale</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">▱</div>

              <div>
                <span>TOTALE IMPORT</span>
                <h3>$0</h3>
                <p>Totale speso in forniture</p>
              </div>
            </div>

          </div>

          <div className="welcome">
            <span className="goldLine"></span>

            <p className="welcomeLabel">
              GESTIONALE UFFICIALE
            </p>

            <h2>AQUA BAR</h2>

            <p className="welcomeText">
              Gestisci fatture, vendite e forniture del locale.
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}
