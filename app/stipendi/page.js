
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function StipendiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [stipendi, setStipendi] = useState([]);
  const [pagamenti, setPagamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  // ==========================================
  // FORMATTAZIONE
  // ==========================================

  const money = (value) =>
    Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const dateIT = (value) => {
    if (!value) return "-";

    const [year, month, day] = value
      .slice(0, 10)
      .split("-");

    return `${day}/${month}/${year}`;
  };

  // ==========================================
  // CARICAMENTO DATI
  // ==========================================

  async function loadStipendi() {
    const [salaryResult, paymentsResult] =
      await Promise.all([
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

  // ==========================================
  // ACCESSO AMMINISTRATORE
  // ==========================================

  useEffect(() => {
    let mounted = true;

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

        const {
          data: profilo,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("nome, ruolo, attivo")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profilo ||
          profilo.ruolo !== "admin" ||
          profilo.attivo !== true
        ) {
          router.replace("/");
          return;
        }

        if (!mounted) return;

        setProfile(profilo);

        // Recupera le settimane già concluse.
        // ON CONFLICT nel database evita duplicati.
        const { error: archiveError } =
          await supabase.rpc(
            "registra_stipendi_arretrati"
          );

        if (archiveError && mounted) {
          setMessage(
            "Attenzione: impossibile aggiornare " +
            "gli stipendi arretrati. " +
            archiveError.message
          );
        }

        if (mounted) {
          await loadStipendi();
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setMessage(
            `Errore caricamento: ${error.message}`
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ==========================================
  // PAGAMENTO STIPENDIO
  // ==========================================

  async function pagaStipendio(pagamento) {
    if (saving !== null) return;

    const dipendente = stipendi.find(
      (s) => s.employee_id === pagamento.employee_id
    );

    const nome =
      dipendente?.nome || "questo dipendente";

    const conferma = window.confirm(
      "CONFERMA PAGAMENTO STIPENDIO\n\n" +
      `Dipendente: ${nome}\n` +
      `Periodo: ${dateIT(pagamento.period_start)} ` +
      `- ${dateIT(pagamento.period_end)}\n` +
      `Importo: $${money(pagamento.amount)}\n\n` +
      "L'importo verrà sottratto dal Fondo Cassa.\n\n" +
      "Vuoi procedere?"
    );

    if (!conferma) return;

    setSaving(`paga-${pagamento.id}`);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "paga_stipendio",
        {
          p_payment_id: pagamento.id,
        }
      );

      if (error) throw error;

      const importo = Number(
        data?.amount ?? pagamento.amount
      );

      setMessage(
        `Pagamento di ${nome} completato. ` +
        `$${money(importo)} sottratti dal Fondo Cassa.`
      );

      try {
        await loadStipendi();
      } catch (refreshError) {
        setMessage(
          `Pagamento di ${nome} completato, ` +
          `ma impossibile aggiornare la pagina: ` +
          refreshError.message
        );
      }
    } catch (error) {
      setMessage(
        `Errore pagamento: ${error.message}`
      );
    } finally {
      setSaving(null);
    }
  }

  // ==========================================
  // ANNULLAMENTO PAGAMENTO
  // ==========================================

  async function annullaPagamento(pagamento) {
    if (saving !== null) return;

    const dipendente = stipendi.find(
      (s) => s.employee_id === pagamento.employee_id
    );

    const nome =
      dipendente?.nome || "questo dipendente";

    const conferma = window.confirm(
      "ANNULLA PAGAMENTO STIPENDIO\n\n" +
      `Dipendente: ${nome}\n` +
      `Periodo: ${dateIT(pagamento.period_start)} ` +
      `- ${dateIT(pagamento.period_end)}\n` +
      `Importo: $${money(pagamento.amount)}\n\n` +
      "Lo stipendio tornerà tra quelli da pagare.\n" +
      "Il Fondo Cassa sarà rimborsato soltanto " +
      "se era stato effettivamente addebitato.\n\n" +
      "Confermi l'annullamento?"
    );

    if (!conferma) return;

    setSaving(`annulla-${pagamento.id}`);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "annulla_pagamento_stipendio",
        {
          p_payment_id: pagamento.id,
        }
      );

      if (error) throw error;

      const rimborso = Number(
        data?.rimborso || 0
      );

      const messaggio =
        rimborso > 0
          ? `Pagamento di ${nome} annullato. ` +
            `$${money(rimborso)} restituiti ` +
            `al Fondo Cassa. ` +
            `Lo stipendio è nuovamente da pagare.`
          : `Pagamento di ${nome} annullato. ` +
            `Nessun rimborso necessario: ` +
            `il Fondo Cassa non era stato addebitato. ` +
            `Lo stipendio è nuovamente da pagare.`;

      setMessage(messaggio);

      try {
        await loadStipendi();
      } catch (refreshError) {
        setMessage(
          messaggio +
          " Attenzione: impossibile aggiornare " +
          "la pagina. " +
          refreshError.message
        );
      }
    } catch (error) {
      setMessage(
        `Errore annullamento: ${error.message}`
      );
    } finally {
      setSaving(null);
    }
  }

  // ==========================================
  // AGGIORNAMENTO MANUALE
  // ==========================================

  async function aggiornaStipendi() {
    if (saving !== null) return;

    setSaving("aggiorna");
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "registra_stipendi_arretrati"
      );

      if (error) throw error;

      await loadStipendi();

      setMessage(
        "Stipendi aggiornati correttamente."
      );
    } catch (error) {
      setMessage(
        `Errore aggiornamento: ${error.message}`
      );
    } finally {
      setSaving(null);
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ==========================================
  // CALCOLI RIEPILOGO
  // ==========================================

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

  const totalePagati = pagati.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  function trovaDipendente(employeeId) {
    return stipendi.find(
      (s) => s.employee_id === employeeId
    );
  }

  // ==========================================
  // CARICAMENTO
  // ==========================================

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loadingText">
          AQUA BAR
        </div>
      </main>
    );
  }

  // ==========================================
  // PAGINA STIPENDI
  // ==========================================

  return (
    <main>
      <div className="overlay">

        {/* SIDEBAR UNIFICATA */}
        <Sidebar profile={profile} />

        <section className="content">

          {/* HEADER */}
          <header>
            <div>
              <p className="eyebrow">
                AMMINISTRAZIONE
              </p>

              <h2>Gestione Stipendi</h2>

              <p className="subtitle">
                Gestione settimanale — Sabato / Sabato
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
                  {profile?.nome}
                </strong>

                <span>
                  <i className="onlineDot"></i>
                  Amministratore
                </span>
              </div>

              <button
                type="button"
                className="logoutButton"
                onClick={logout}
              >
                Esci
              </button>
            </div>
          </header>

          {/* ==================================
              RIEPILOGO STIPENDI
          ================================== */}

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

                <h3>
                  ${money(totaleFatturato)}
                </h3>

                <p>Fatture non annullate</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">%</div>

              <div>
                <span>STIPENDI SETTIMANALI</span>

                <h3>
                  ${money(totaleStipendi)}
                </h3>

                <p>Settimana corrente</p>
              </div>
            </div>

            <div className="card">
              <div className="cardIcon">!</div>

              <div>
                <span>STIPENDI DA PAGARE</span>

                <h3>
                  ${money(totaleArretrati)}
                </h3>

                <p>
                  {arretrati.length} pagamenti in sospeso
                </p>
              </div>
            </div>

          </div>

          {/* MESSAGGI */}

          {message && (
            <div
              className="salaryMessage"
              role="status"
            >
              {message}
            </div>
          )}

          {/* ==================================
              SETTIMANA CORRENTE
          ================================== */}

          <div className="salaryPanel">

            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  SETTIMANA CORRENTE
                </p>

                <h2>
                  Stipendi Dipendenti
                </h2>

                <p>
                  Gli stipendi si accumulano
                  durante la settimana e
                  ripartono da zero ogni sabato.
                  Le settimane concluse rimangono
                  salvate tra gli stipendi da pagare.
                </p>
              </div>

              <span>
                {stipendi.length} dipendenti
              </span>
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
                stipendi.map((dipendente) => (
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

                      <strong>
                        {dipendente.nome}
                      </strong>
                    </div>

                    <div className="salaryRoleDisplay">
                      <span>
                        {dipendente.ruolo_lavorativo ||
                          "Dipendente"}
                      </span>
                    </div>

                    <div className="salaryPercentageDisplay">
                      <strong>
                        {money(
                          dipendente.percentuale
                        )}%
                      </strong>
                    </div>

                    <strong className="salaryRevenue">
                      ${money(dipendente.fatturato)}
                    </strong>

                    <strong className="salaryAmount">
                      ${money(dipendente.stipendio)}
                    </strong>

                    <div className="salaryAutoBadge">
                      IN MATURAZIONE
                    </div>

                  </div>
                ))
              )}

            </div>
          </div>

          {/* ==================================
              STIPENDI DA PAGARE
          ================================== */}

          <div className="salaryPanel">

            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  PAGAMENTI IN SOSPESO
                </p>

                <h2>
                  Stipendi da Pagare
                </h2>

                <p>
                  Gli stipendi delle settimane
                  concluse rimangono disponibili
                  finché non vengono pagati.
                </p>
              </div>

              <span>
                {arretrati.length} da pagare
              </span>
            </div>

            <div
              style={{
                padding: "12px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <strong style={{ color: "#d4af37" }}>
                TOTALE DA PAGARE:
                {" "}${money(totaleArretrati)}
              </strong>

              <button
                type="button"
                className="cancelImportButton"
                disabled={saving !== null}
                onClick={aggiornaStipendi}
              >
                {saving === "aggiorna"
                  ? "AGGIORNAMENTO..."
                  : "AGGIORNA STIPENDI"}
              </button>
            </div>

            <div className="salaryTableHeader">
              <span>DIPENDENTE</span>
              <span>STATO</span>
              <span>PERCENTUALE</span>
              <span>SCADENZA</span>
              <span>STIPENDIO</span>
              <span>AZIONE</span>
            </div>

            <div className="salaryList">

              {arretrati.length === 0 ? (
                <div className="emptyCart">
                  Nessuno stipendio da pagare.
                </div>
              ) : (
                arretrati.map((pagamento) => {
                  const dipendente =
                    trovaDipendente(
                      pagamento.employee_id
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

                        <div>
                          <strong>
                            {dipendente?.nome ||
                              "Dipendente"}
                          </strong>

                          <div
                            style={{
                              fontSize: "11px",
                              opacity: 0.7,
                              marginTop: "5px",
                            }}
                          >
                            {dateIT(
                              pagamento.period_start
                            )}
                            {" - "}
                            {dateIT(
                              pagamento.period_end
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="salaryRoleDisplay">
                        <span>DA PAGARE</span>
                      </div>

                      <div className="salaryPercentageDisplay">
                        <strong>
                          {money(
                            pagamento.percentuale
                          )}%
                        </strong>
                      </div>

                      <div className="salaryRevenue">
                        <strong>
                          {dateIT(
                            pagamento.due_date
                          )}
                        </strong>
                      </div>

                      <strong className="salaryAmount">
                        ${money(pagamento.amount)}
                      </strong>

                      <div className="salaryAutoBadge">
                        <button
                          type="button"
                          className="cancelImportButton"
                          disabled={saving !== null}
                          onClick={() =>
                            pagaStipendio(pagamento)
                          }
                        >
                          {saving ===
                          `paga-${pagamento.id}`
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

          {/* ==================================
              STORICO STIPENDI PAGATI
          ================================== */}

          <div className="salaryPanel">

            <div className="salaryPanelHeader">
              <div>
                <p className="welcomeLabel">
                  STORICO PAGAMENTI
                </p>

                <h2>
                  Stipendi Pagati
                </h2>

                <p>
                  Pagamenti confermati
                  dall'amministrazione.
                  Puoi annullare un pagamento
                  e ripristinare lo stipendio
                  tra quelli da pagare.
                </p>
              </div>

              <span>
                {pagati.length} pagati
              </span>
            </div>

            <div
              style={{
                padding: "12px 20px",
              }}
            >
              <strong style={{ color: "#d4af37" }}>
                TOTALE PAGATO:
                {" "}${money(totalePagati)}
              </strong>
            </div>

            <div className="salaryTableHeader">
              <span>DIPENDENTE</span>
              <span>STATO</span>
              <span>PERCENTUALE</span>
              <span>SCADENZA</span>
              <span>STIPENDIO</span>
              <span>AZIONE</span>
            </div>

            <div className="salaryList">

              {pagati.length === 0 ? (
                <div className="emptyCart">
                  Nessun pagamento ancora registrato.
                </div>
              ) : (
                pagati.map((pagamento) => {
                  const dipendente =
                    trovaDipendente(
                      pagamento.employee_id
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

                        <div>
                          <strong>
                            {dipendente?.nome ||
                              "Dipendente"}
                          </strong>

                          <div
                            style={{
                              fontSize: "11px",
                              opacity: 0.7,
                              marginTop: "5px",
                            }}
                          >
                            {dateIT(
                              pagamento.period_start
                            )}
                            {" - "}
                            {dateIT(
                              pagamento.period_end
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="salaryRoleDisplay">
                        <span>PAGATO</span>
                      </div>

                      <div className="salaryPercentageDisplay">
                        <strong>
                          {money(
                            pagamento.percentuale
                          )}%
                        </strong>
                      </div>

                      <div className="salaryRevenue">
                        <strong>
                          {dateIT(
                            pagamento.due_date
                          )}
                        </strong>
                      </div>

                      <strong className="salaryAmount">
                        ${money(pagamento.amount)}
                      </strong>

                      <div className="salaryAutoBadge">
                        <button
                          type="button"
                          className="cancelImportButton"
                          style={{
                            color: "#ff7777",
                            borderColor:
                              "rgba(255,100,100,0.5)",
                          }}
                          disabled={saving !== null}
                          onClick={() =>
                            annullaPagamento(pagamento)
                          }
                        >
                          {saving ===
                          `annulla-${pagamento.id}`
                            ? "ATTENDI..."
                            : "ANNULLA PAGAMENTO"}
                        </button>
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
