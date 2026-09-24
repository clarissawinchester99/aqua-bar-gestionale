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
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }

      const user = session.user;

      const [
        profileResult,
        accountResult,
        invoiceResult,
        importResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("nome, ruolo, attivo")
          .eq("id", user.id)
          .single(),

        supabase
          .from("company_account")
          .select("saldo")
          .eq("id", 1)
          .single(),

        supabase
          .from("invoices")
          .select("totale")
          .eq("employee_id", user.id)
          .eq("annullato", false),

        supabase.rpc("totale_import_attivi"),
      ]);

      /* PROFILO */

      if (profileResult.error) {
        console.error(
          "Errore profilo:",
          profileResult.error
        );
      } else {
        if (profileResult.data?.attivo === false) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setProfile(profileResult.data);
      }

      /* FONDO CASSA */

      if (accountResult.error) {
        console.error(
          "Errore fondo cassa:",
          accountResult.error
        );
      } else {
        setSaldo(
          Number(accountResult.data?.saldo) || 0
        );
      }

      /* FATTURATO PERSONALE */

      if (invoiceResult.error) {
        console.error(
          "Errore fatturato:",
          invoiceResult.error
        );
      } else {
        const totale =
          (invoiceResult.data || []).reduce(
            (somma, fattura) =>
              somma +
              Number(fattura.totale || 0),
            0
          );

        setFatturato(totale);
      }

      /* TOTALE IMPORT */

      if (importResult.error) {
        console.error(
          "Errore totale import:",
          importResult.error
        );

        setTotaleImport(0);
      } else {
        setTotaleImport(
          Number(importResult.data) || 0
        );
      }
    } catch (error) {
      console.error(
        "Errore caricamento Dashboard:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /* LOGOUT */

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /* FORMATTAZIONE SOLDI */

  function formatMoney(value) {
    return Number(value || 0).toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  }

  /* CARICAMENTO */

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

        {/* =========================
            SIDEBAR
        ========================= */}

        <aside className="sidebar">

          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>

            {/* DASHBOARD */}

            <button className="active">
              <span className="navIcon">
                ⌂
              </span>

              Dashboard
            </button>

            {/* FATTURE */}

            <button
              onClick={() =>
                router.push("/fatture")
              }
            >
              <span className="navIcon">
                ▤
              </span>

              Fatture
            </button>

            {/* IMPORT */}

            <button
              onClick={() =>
                router.push("/import")
              }
            >
              <span className="navIcon">
                ◇
              </span>

              Import
            </button>

            {/* MENU AMMINISTRATORE */}

            {profile?.ruolo === "admin" && (
              <>

                {/* STIPENDI */}

                <button
                  onClick={() =>
                    router.push("/stipendi")
                  }
                >
                  <span className="navIcon">
                    ♙
                  </span>

                  Stipendi
                </button>

                {/* DIPENDENTI */}

                <button
                  onClick={() =>
                    router.push("/dipendenti")
                  }
                >
                  <span className="navIcon">
                    ♟
                  </span>

                  Dipendenti
                </button>

              </>
            )}

          </nav>

          <div className="sidebarBottom">

            <p>
              Gestionale AQUA BAR
            </p>

            <small>
              FiveM Management
            </small>

          </div>

        </aside>

        {/* =========================
            CONTENUTO
        ========================= */}

        <section className="content">

          {/* HEADER */}

          <header>

            <div>

              <p className="eyebrow">
                AQUA BAR
              </p>

              <h2>
                Dashboard
              </h2>

              <p className="subtitle">
                Benvenuto nel gestionale del locale
              </p>

            </div>

            {/* UTENTE */}

            <div className="user">

              <div className="avatar">

                {profile?.nome
                  ?.charAt(0)
                  .toUpperCase() ||
                  "A"}

              </div>

              <div className="userInfo">

                <strong>
                  {profile?.nome ||
                    "Utente"}
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

          {/* =========================
              CARDS
          ========================= */}

          <div className="cards">

            {/* FONDO CASSA */}

            <div className="card">

              <div className="cardIcon">
                ◎
              </div>

              <div>

                <span>
                  FONDO CASSA
                </span>

                <h3>
                  ${formatMoney(saldo)}
                </h3>

                <p>
                  Conto aziendale AQUA BAR
                </p>

              </div>

            </div>

            {/* FATTURATO PERSONALE */}

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

            {/* TOTALE IMPORT */}

            <div className="card">

              <div className="cardIcon">
                ▱
              </div>

              <div>

                <span>
                  TOTALE IMPORT
                </span>

                <h3>
                  ${formatMoney(totaleImport)}
                </h3>

                <p>
                  Import attivi non annullati
                </p>

              </div>

            </div>

          </div>

          {/* =========================
              BENVENUTO
          ========================= */}

          <div className="welcome">

            <span className="goldLine"></span>

            <p className="welcomeLabel">
              GESTIONALE UFFICIALE
            </p>

            <h2>
              AQUA BAR
            </h2>

            <p className="welcomeText">
              Gestisci fatture, vendite,
              forniture e personale del locale.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}
