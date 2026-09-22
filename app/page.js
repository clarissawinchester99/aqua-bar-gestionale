"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [fatturato, setFatturato] = useState(0);
  const [totaleImport, setTotaleImport] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("nome, ruolo")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Errore profilo:", profileError);
    } else {
      setProfile(profileData);
    }

    const { data: accountData, error: accountError } = await supabase
      .from("company_account")
      .select("saldo")
      .eq("id", 1)
      .single();

    if (accountError) {
      console.error("Errore fondo cassa:", accountError);
    } else {
      setSaldo(Number(accountData?.saldo) || 0);
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select("totale")
      .eq("employee_id", user.id);

    if (invoiceError) {
      console.error("Errore fatturato:", invoiceError);
    } else {
      const totale = (invoiceData || []).reduce(
        (somma, fattura) =>
          somma + Number(fattura.totale || 0),
        0
      );

      setFatturato(totale);
    }

    const { data: importData, error: importError } = await supabase
      .from("imports")
      .select("totale")
      .eq("employee_id", user.id);

    if (importError) {
      console.error("Errore import:", importError);
    } else {
      const totale = (importData || []).reduce(
        (somma, ordine) =>
          somma + Number(ordine.totale || 0),
        0
      );

      setTotaleImport(totale);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loadingText">
          AQUA BAR
        </div>
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

            <button
              onClick={() => router.push("/fatture")}
            >
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button
              onClick={() => router.push("/import")}
            >
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
              <p className="eyebrow">
                AQUA BAR
              </p>

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
              >
                Esci
              </button>

            </div>

          </header>

          <div className="cards">

            <div className="card">

              <div className="cardIcon">
                ◎
              </div>

              <div>
                <span>FONDO CASSA</span>

                <h3>
                  ${formatMoney(saldo)}
                </h3>

                <p>
                  Conto aziendale AQUA BAR
                </p>
              </div>

            </div>

            <div className="card">

              <div className="cardIcon">
                ♙
              </div>

              <div>
                <span>
                  FATTURATO PERSONALE
                </span>

                <h3>
                  ${formatMoney(fatturato)}
                </h3>

                <p>
                  Il tuo fatturato totale
                </p>
              </div>

            </div>

            <div className="card">

              <div className="cardIcon">
                ▱
              </div>

              <div>
                <span>TOTALE IMPORT</span>

                <h3>
                  ${formatMoney(totaleImport)}
                </h3>

                <p>
                  Totale speso in forniture
                </p>
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
