"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function StipendiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [stipendi, setStipendi] = useState([]);
  const [pagamenti, setPagamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  const money = (value) =>
    Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const dateIT = (value) => {
    if (!value) return "-";
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  };

  const oggiItalia = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const isSabato = () => {
    const giorno = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Europe/Rome",
    }).format(new Date());

    return giorno === "Sat";
  };

  async function loadStipendi() {
    const [salaryResult, paymentsResult] = await Promise.all([
      supabase.rpc("get_stipendi_settimanali"),
      supabase.rpc("get_pagamenti_stipendi"),
    ]);

    if (salaryResult.error) {
      throw salaryResult.error;
    }

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    setStipendi(salaryResult.data || []);
    setPagamenti(paymentsResult.data || []);
  }

  useEffect(() => {
    async function loadPage() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        const { data: profilo, error: profileError } =
          await supabase
            .from("profiles")
            .select("nome, ruolo")
            .eq("id", user.id)
            .single();

        if (
          profileError ||
          !profilo ||
          profilo.ruolo !== "admin"
        ) {
          router.replace("/");
          return;
        }

        setProfile(profilo);
        await loadStipendi();
      } catch (error) {
        console.error(error);
        setMessage(
          `Errore caricamento: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [router]);

  async function pagaSabato(dipendente) {
    if (saving !== null || !isSabato()) return;

    const conferma = window.confirm(
      `Confermi il pagamento dello stipendio ` +
      `della settimana conclusa a ${dipendente.nome}?`
    );

    if (!conferma) return;

    setSaving(`sabato-${dipendente.employee_id}`);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "paga_stipendio_sabato",
        {
          p_employee_id: dipendente.employee_id,
        }
      );

      if (error) throw error;

      await loadStipendi();

      setMessage(
        `Stipendio di ${dipendente.nome} segnato come PAGATO.`
      );
    } catch (error) {
      setMessage(`Errore: ${error.message}`);
    } finally {
      setSaving(null);
    }
  }

  async function pagaArretrato(pagamento) {
    if (saving !== null) return;

    const dipendente = stipendi.find(
      (s) => s.employee_id === pagamento.employee_id
    );

    const conferma = window.confirm(
      `Confermi il pagamento di $${money(pagamento.amount)} ` +
      `a ${dipendente?.nome || "questo dipendente"}?\n` +
      `Scadenza: ${dateIT(pagamento.due_date)}`
    );

    if (!conferma) return;

    setSaving(`arretrato-${pagamento.id}`);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "paga_stipendio",
        { p_payment_id: pagamento.id }
      );

      if (error) throw error;

      await loadStipendi();

      setMessage("Stipendio segnato come PAGATO.");
    } catch (error) {
      setMessage(`Errore: ${error.message}`);
    } finally {
      setSaving(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const totaleFatturato = stipendi.reduce(
    (sum, s) => sum + Number(s.fatturato || 0),
    0
  );

  const totaleStipendi = stipendi.reduce(
    (sum, s) => sum + Number(s.stipendio || 0),
    0
  );

  const arretrati = pagamenti.filter(
    (p) => p.status === "da_pagare"
  );

  const pagati = pagamenti.filter(
    (p) => p.status === "pagato"
  );

  const totaleArretrati = arretrati.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const sabato = isSabato();
  const oggi = oggiItalia();

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
              Stipendi
            </button>

            <button onClick={() => router.push("/dipendenti")}>
              <span className="navIcon">♟</span>
              Dipendenti
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
              <p className="eyebrow">AMMINISTRAZIONE</p>
              <h2>Stipendi</h2>
              <p className="subtitle">
                Gestione settimanale — Sabato / Sabato
              </p>
            </div>

            <div className="user">
              <div className="avatar">
                {profile?.nome?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="userInfo">
                <strong>{profile?.nome}</strong>
                <span>
                  <i className="onlineDot"></i>
                  Amministratore
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

          <div className="salaryCards">
            <div className="card">
              <div className="cardIcon">♙</div>
              <div>
                <span>DIPENDENTI</span>
                <h3>{stipendi.length}</h3>
                <p>Dipendenti registrati</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">$</div>
              <div>
                <span>FATTURATO SETTIMANALE</span>
                <h3>${money(totaleFatturato)}</h3>
                <p>Fatture non annullate</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">%</div>
              <div>
                <span>STIPENDI SETTIMANALI</span>
                <h3>${money(totaleStipendi)}</h3>
                <p>Settimana corrente</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">!</div>
              <div>
                <span>STIPENDI DA PAGARE</span>
                <h3>${money(totaleArretrati)}</h3>
                <p>{arretrati.length} pagamenti in sospeso</p>
              </div>
            </div>
          </div>

          {message && (
            <div className="salaryMessage">
              {message}
            </div>
          )}

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  SETTIMANA CORRENTE
                </p>
                <h2>Stipendi Dipendenti</h2>
                <p>
                  Lo stipendio si accumula dalle fatture
                  e riparte da zero ogni sabato.
                </p>
              </div>

              <span>{stipendi.length} dipendenti</span>
            </div>

            <div className="salaryTableHeader">
              <span>DIPENDENTE</span>
              <span>RUOLO</span>
              <span>PERCENTUALE</span>
              <span>FATTURATO</span>
              <span>STIPENDIO</span>
              <span>AZIONE</span>
            </div>

            <div className="salaryList">
              {stipendi.length === 0 ? (
                <div className="emptyCart">
                  Nessun dipendente registrato.
                </div>
              ) : (
                stipendi.map((dipendente) => {
                  const pagatoSabato =
                    sabato &&
                    pagamenti.some(
                      (p) =>
                        p.employee_id ===
                          dipendente.employee_id &&
                        p.due_date === oggi &&
                        p.status === "pagato"
                    );

                  return (
                    <div
                      className="salaryRow"
                      key={dipendente.employee_id}
                    >
                      <div className="salaryEmployee">
                        <div className="salaryAvatar">
                          {dipendente.nome
                            ?.charAt(0)
                            .toUpperCase() || "D"}
                        </div>
                        <strong>{dipendente.nome}</strong>
                      </div>

                      <div className="salaryRoleDisplay">
                        <span>
                          {dipendente.ruolo_lavorativo ||
                            "Dipendente"}
                        </span>
                      </div>

                      <div className="salaryPercentageDisplay">
                        <strong>
                          {money(dipendente.percentuale)}%
                        </strong>
                      </div>

                      <strong className="salaryRevenue">
                        ${money(dipendente.fatturato)}
                      </strong>

                      <strong className="salaryAmount">
                        ${money(dipendente.stipendio)}
                      </strong>

                      <div className="salaryAutoBadge">
                        {pagatoSabato ? (
                          "PAGATO"
                        ) : sabato ? (
                          <button
                            className="cancelImportButton"
                            disabled={saving !== null}
                            onClick={() =>
                              pagaSabato(dipendente)
                            }
                          >
                            {saving ===
                            `sabato-${dipendente.employee_id}`
                              ? "ATTENDI..."
                              : "STIPENDIO PAGATO"}
                          </button>
                        ) : (
                          "AUTO"
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  PAGAMENTI IN SOSPESO
                </p>
                <h2>Stipendi da Pagare</h2>
                <p>
                  Stipendi delle settimane concluse,
                  con data di scadenza.
                </p>
              </div>

              <span>{arretrati.length} da pagare</span>
            </div>

            <div className="salaryList">
              {arretrati.length === 0 ? (
                <div className="emptyCart">
                  Nessuno stipendio arretrato.
                </div>
              ) : (
                arretrati.map((pagamento) => {
                  const dipendente = stipendi.find(
                    (s) =>
                      s.employee_id === pagamento.employee_id
                  );

                  return (
                    <div
                      className="salaryRow"
                      key={pagamento.id}
                    >
                      <div className="salaryEmployee">
                        <div className="salaryAvatar">
                          {dipendente?.nome
                            ?.charAt(0)
                            .toUpperCase() || "D"}
                        </div>
                        <strong>
                          {dipendente?.nome || "Dipendente"}
                        </strong>
                      </div>

                      <div className="salaryRoleDisplay">
                        <span>DA PAGARE</span>
                      </div>

                      <div className="salaryPercentageDisplay">
                        <strong>
                          {money(pagamento.percentuale)}%
                        </strong>
                      </div>

                      <div className="salaryRevenue">
                        <strong>
                          {dateIT(pagamento.due_date)}
                        </strong>
                      </div>

                      <strong className="salaryAmount">
                        ${money(pagamento.amount)}
                      </strong>

                      <div className="salaryAutoBadge">
                        <button
                          className="cancelImportButton"
                          disabled={saving !== null}
                          onClick={() =>
                            pagaArretrato(pagamento)
                          }
                        >
                          {saving ===
                          `arretrato-${pagamento.id}`
                            ? "ATTENDI..."
                            : "STIPENDIO PAGATO"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="salaryPanel">
            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  STORICO PAGAMENTI
                </p>
                <h2>Stipendi Pagati</h2>
                <p>
                  Pagamenti confermati
                  dall'amministrazione.
                </p>
              </div>

              <span>{pagati.length} pagati</span>
            </div>

            <div className="salaryList">
              {pagati.length === 0 ? (
                <div className="emptyCart">
                  Nessun pagamento ancora registrato.
                </div>
              ) : (
                pagati.map((pagamento) => {
                  const dipendente = stipendi.find(
                    (s) =>
                      s.employee_id === pagamento.employee_id
                  );

                  return (
                    <div
                      className="salaryRow"
                      key={pagamento.id}
                    >
                      <div className="salaryEmployee">
                        <div className="salaryAvatar">
                          {dipendente?.nome
                            ?.charAt(0)
                            .toUpperCase() || "D"}
                        </div>
                        <strong>
                          {dipendente?.nome || "Dipendente"}
                        </strong>
                      </div>

                      <div className="salaryRoleDisplay">
                        <span>PAGATO</span>
                      </div>

                      <div className="salaryPercentageDisplay">
                        <strong>
                          {money(pagamento.percentuale)}%
                        </strong>
                      </div>

                      <div className="salaryRevenue">
                        <strong>
                          {dateIT(pagamento.due_date)}
                        </strong>
                      </div>

                      <strong className="salaryAmount">
                        ${money(pagamento.amount)}
                      </strong>

                      <div className="salaryAutoBadge">
                        PAGATO
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
