
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
  const [mioStipendio, setMioStipendio] = useState(0);
  const [stipendiDaPagare, setStipendiDaPagare] = useState(0);
  const [stipendioError, setStipendioError] = useState(false);
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
        stipendioResult,
        pagamentiResult,
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

        supabase.rpc("get_mio_stipendio"),

        supabase.rpc("get_pagamenti_stipendi"),
      ]);

      if (profileResult.error || !profileResult.data) {
        throw new Error("Impossibile caricare il profilo.");
      }

      if (profileResult.data.attivo === false) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfile(profileResult.data);

      if (accountResult.error) {
        console.error(
          "Errore fondo cassa:",
          accountResult.error
        );
      } else {
        setSaldo(Number(accountResult.data?.saldo) || 0);
      }

      if (invoiceResult.error) {
        console.error(
          "Errore fatturato:",
          invoiceResult.error
        );
      } else {
        const totale = (invoiceResult.data || []).reduce(
          (somma, fattura) =>
            somma + Number(fattura.totale || 0),
          0
        );

        setFatturato(totale);
      }

      if (importResult.error) {
        console.error(
          "Errore totale import:",
          importResult.error
        );
        setTotaleImport(0);
      } else {
        setTotaleImport(Number(importResult.data) || 0);
      }

      if (stipendioResult.error) {
        console.error(
          "Errore stipendio:",
          stipendioResult.error
        );
        setStipendioError(true);
      } else {
        const mio = (stipendioResult.data || [])[0];
        setMioStipendio(Number(mio?.stipendio) || 0);
      }

      if (pagamentiResult.error) {
        console.error(
          "Errore pagamenti:",
          pagamentiResult.error
        );
        setStipendioError(true);
      } else {
        const mieiPagamenti = (
          pagamentiResult.data || []
        ).filter(
          (pagamento) =>
            pagamento.employee_id === user.id &&
            pagamento.status === "da_pagare"
        );

        setStipendiDaPagare(mieiPagamenti.length);
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
        <div className="loadingText">AQUA BAR</div>
      </main>
    );
  }

  return (
    <main>
      <div className="overlay">
        {/* MENU LATERALE */}

        <aside className="sidebar">
          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>
            {/* MENU GENERALE */}

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

            <button
              onClick={() => router.push("/mio-stipendio")}
            >
              <span className="navIcon">♙</span>
              Il mio stipendio
            </button>

            {/* AREA RISERVATA ADMIN */}

            {profile?.ruolo === "admin" && (
              <>
                <div
                  style={{
                    marginTop: "26px",
                    marginBottom: "12px",
                    padding: "16px 12px 8px",
                    borderTop:
                      "1px solid rgba(212,175,55,0.3)",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#d4af37",
                      fontSize: "11px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                    }}
                  >
                    ♛ AREA AMMINISTRATORE
                  </span>
                </div>

                <button
                  onClick={() => router.push("/dipendenti")}
                >
                  <span className="navIcon">♟</span>
                  Gestione Dipendenti
                </button>

                <button
                  onClick={() =>
                    router.push("/admin/catalogo")
                  }
                >
                  <span className="navIcon">▦</span>
                  Gestione Catalogo
                </button>

                <button
                  onClick={() =>
                    router.push("/admin/import")
                  }
                >
                  <span className="navIcon">▱</span>
                  Gestione Import
                </button>

                <button
                  onClick={() => router.push("/stipendi")}
                >
                  <span className="navIcon">♙</span>
                  Gestione Stipendi
                </button>
              </>
            )}
          </nav>

          <div className="sidebarBottom">
            <p>Gestionale AQUA BAR</p>
            <small>FiveM Management</small>
          </div>
        </aside>

        {/* CONTENUTO DASHBOARD */}

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
                {profile?.nome
                  ?.charAt(0)
                  .toUpperCase() || "A"}
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

          {/* CARDS ORIGINALI */}

          <div className="cards">
            <div className="card">
              <div className="cardIcon">◎</div>
              <div>
                <span>FONDO CASSA</span>
                <h3>${formatMoney(saldo)}</h3>
                <p>Conto aziendale AQUA BAR</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">♙</div>
              <div>
                <span>FATTURATO PERSONALE</span>
                <h3>${formatMoney(fatturato)}</h3>
                <p>Il tuo fatturato totale</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">▱</div>
              <div>
                <span>TOTALE IMPORT</span>
                <h3>${formatMoney(totaleImport)}</h3>
                <p>Import attivi non annullati</p>
              </div>
            </div>

            {/* STIPENDIO PERSONALE */}

            <div className="card">
              <div className="cardIcon">♙</div>
              <div>
                <span>IL MIO STIPENDIO</span>

                <h3>
                  {stipendioError
                    ? "Non disponibile"
                    : `$${formatMoney(mioStipendio)}`}
                </h3>

                <p>
                  Maturato questa settimana
                  (sabato - sabato)
                </p>

                {!stipendioError &&
                  stipendiDaPagare > 0 && (
                    <p>
                      {stipendiDaPagare}{" "}
                      {stipendiDaPagare === 1
                        ? "stipendio da pagare"
                        : "stipendi da pagare"}
                    </p>
                  )}

                <button
                  type="button"
                  className="logoutButton"
                  onClick={() =>
                    router.push("/mio-stipendio")
                  }
                  style={{ marginTop: "12px" }}
                >
                  Vedi il mio stipendio
                </button>
              </div>
            </div>
          </div>

          {/* BENVENUTO */}

          <div className="welcome">
            <span className="goldLine"></span>

            <p className="welcomeLabel">
              GESTIONALE UFFICIALE
            </p>

            <h2>AQUA BAR</h2>

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
