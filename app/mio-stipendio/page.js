
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function MioStipendioPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [stipendio, setStipendio] = useState(null);
  const [pagamenti, setPagamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const formatDate = (value) => {
    if (!value) return "-";
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    async function loadPage() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select("nome, ruolo, attivo")
          .eq("id", user.id)
          .single();

        if (profileResult.error) throw profileResult.error;

        if (!profileResult.data?.attivo) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setProfile(profileResult.data);

        const [salaryResult, paymentsResult] = await Promise.all([
          supabase.rpc("get_mio_stipendio"),
          supabase.rpc("get_pagamenti_stipendi"),
        ]);

        if (salaryResult.error) throw salaryResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        setStipendio((salaryResult.data || [])[0] || null);

        // Mostriamo soltanto i pagamenti dell'utente.
        const mieiPagamenti = (paymentsResult.data || []).filter(
          (p) => p.employee_id === user.id
        );

        setPagamenti(mieiPagamenti);
      } catch (error) {
        console.error("Errore pagina stipendio:", error);
        setErrorMessage(error.message || "Errore di caricamento.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const arretrati = pagamenti
    .filter((p) => p.status === "da_pagare")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const pagati = pagamenti
    .filter((p) => p.status === "pagato")
    .sort((a, b) => (b.period_start || "").localeCompare(a.period_start || ""));

  const totaleArretrati = arretrati.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

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
            <button onClick={() => router.push("/")}>
              <span className="navIcon">⌂</span>
              Dashboard
            </button>

            <button onClick={() => router.push("/fatture")}>
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button onClick={() => router.push("/import")}>
              <span className="navIcon">◇</span>
              Import
            </button>

            <button className="active">
              <span className="navIcon">♙</span>
              Il mio stipendio
            </button>

            {profile?.ruolo === "admin" && (
              <>
                <button onClick={() => router.push("/stipendi")}>
                  <span className="navIcon">♙</span>
                  Stipendi
                </button>

                <button onClick={() => router.push("/dipendenti")}>
                  <span className="navIcon">♟</span>
                  Dipendenti
                </button>
              </>
            )}
          </nav>

          <div className="sidebarBottom">
            <p>Gestionale AQUA BAR</p>
            <small>FiveM Management</small>
          </div>
        </aside>

        <section className="content">
          <header>
            <div>
              <p className="eyebrow">AREA PERSONALE</p>
              <h2>Il mio stipendio</h2>
              <p className="subtitle">
                Riepilogo settimanale e storico pagamenti
              </p>
            </div>

            <div className="user">
              <div className="avatar">
                {profile?.nome?.charAt(0).toUpperCase() || "D"}
              </div>

              <div className="userInfo">
                <strong>{profile?.nome || "Dipendente"}</strong>
                <span>
                  <i className="onlineDot"></i>
                  {profile?.ruolo === "admin"
                    ? "Amministratore"
                    : "Dipendente"}
                </span>
              </div>

              <button className="logoutButton" onClick={logout}>
                Esci
              </button>
            </div>
          </header>

          {errorMessage && (
            <div className="salaryMessage">
              Errore: {errorMessage}
            </div>
          )}

          <div className="salaryCards">
            <div className="card">
              <div className="cardIcon">◎</div>
              <div>
                <span>STIPENDIO SETTIMANALE</span>
                <h3>
                  {errorMessage
                    ? "Non disponibile"
                    : `$${formatMoney(stipendio?.stipendio)}`}
                </h3>
                <p>Maturato nella settimana corrente</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">▤</div>
              <div>
                <span>FATTURATO SETTIMANALE</span>
                <h3>${formatMoney(stipendio?.fatturato)}</h3>
                <p>Fatture non annullate</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">%</div>
              <div>
                <span>PERCENTUALE STIPENDIO</span>
                <h3>{formatMoney(stipendio?.percentuale)}%</h3>
                <p>Percentuale assegnata</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">!</div>
              <div>
                <span>STIPENDI DA PAGARE</span>
                <h3>${formatMoney(totaleArretrati)}</h3>
                <p>{arretrati.length} pagamenti in sospeso</p>
              </div>
            </div>
          </div>

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">SETTIMANA CORRENTE</p>
                <h2>Il mio riepilogo</h2>
                <p>
                  Il conteggio riparte ogni sabato alle 00:00,
                  secondo l'ora italiana.
                </p>
              </div>
            </div>

            <div style={{ padding: "22px", lineHeight: 2 }}>
              <p>
                <strong>Dipendente:</strong>{" "}
                {stipendio?.nome || profile?.nome || "-"}
              </p>
              <p>
                <strong>Ruolo:</strong>{" "}
                {stipendio?.ruolo_lavorativo || "Dipendente"}
              </p>
              <p>
                <strong>Percentuale:</strong>{" "}
                {formatMoney(stipendio?.percentuale)}%
              </p>
              <p>
                <strong>Fatturato:</strong>{" "}
                ${formatMoney(stipendio?.fatturato)}
              </p>
              <p>
                <strong>Stipendio maturato:</strong>{" "}
                ${formatMoney(stipendio?.stipendio)}
              </p>
            </div>
          </div>

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">PAGAMENTI IN SOSPESO</p>
                <h2>Stipendi da pagare</h2>
                <p>
                  Gli importi rimangono visibili finché
                  l'amministrazione non conferma il pagamento.
                </p>
              </div>
              <span>{arretrati.length} da pagare</span>
            </div>

            <div style={{ padding: "20px" }}>
              {arretrati.length === 0 ? (
                <p>Nessuno stipendio arretrato.</p>
              ) : (
                arretrati.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "16px 0",
                      borderBottom: "1px solid rgba(212,175,55,.25)",
                    }}
                  >
                    <strong>${formatMoney(p.amount)}</strong>
                    <p>
                      Settimana: {formatDate(p.period_start)} -{" "}
                      {formatDate(p.period_end)}
                    </p>
                    <p>Scadenza: {formatDate(p.due_date)}</p>
                    <p>Stato: DA PAGARE</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">STORICO PAGAMENTI</p>
                <h2>Stipendi pagati</h2>
                <p>
                  Pagamenti confermati dall'amministrazione.
                </p>
              </div>
              <span>{pagati.length} pagati</span>
            </div>

            <div style={{ padding: "20px" }}>
              {pagati.length === 0 ? (
                <p>Nessun pagamento registrato.</p>
              ) : (
                pagati.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "16px 0",
                      borderBottom: "1px solid rgba(212,175,55,.25)",
                    }}
                  >
                    <strong>${formatMoney(p.amount)}</strong>
                    <p>
                      Settimana: {formatDate(p.period_start)} -{" "}
                      {formatDate(p.period_end)}
                    </p>
                    <p>Scadenza: {formatDate(p.due_date)}</p>
                    <p>Stato: PAGATO</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
