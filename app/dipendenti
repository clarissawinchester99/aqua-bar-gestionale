"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DipendentiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [dipendenti, setDipendenti] = useState([]);

  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ruoloLavorativo, setRuoloLavorativo] =
    useState("Dipendente");
  const [percentuale, setPercentuale] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profilo, error: profileError } =
        await supabase
          .from("profiles")
          .select("nome, ruolo, attivo")
          .eq("id", session.user.id)
          .single();

      if (profileError || !profilo) {
        console.error(profileError);
        router.replace("/");
        return;
      }

      if (
        profilo.ruolo !== "admin" ||
        profilo.attivo === false
      ) {
        router.replace("/");
        return;
      }

      setProfile(profilo);

      await loadDipendenti();
    } catch (error) {
      console.error(
        "Errore caricamento dipendenti:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    CHIAMATA EDGE FUNCTION
    ========================================
  */

  async function callGestioneDipendenti(body) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Sessione non valida.");
    }

    const { data, error } =
      await supabase.functions.invoke(
        "gestione-dipendenti",
        {
          body,
        }
      );

    if (error) {
      let errorMessage =
        "Errore durante l'operazione.";

      try {
        const context =
          error.context;

        if (context) {
          const result =
            await context.json();

          if (result?.error) {
            errorMessage =
              result.error;
          }
        }
      } catch {
        // Mantiene il messaggio generico
      }

      throw new Error(errorMessage);
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          "Operazione non riuscita."
      );
    }

    return data;
  }

  /*
    ========================================
    CARICA DIPENDENTI
    ========================================
  */

  async function loadDipendenti() {
    try {
      const data =
        await callGestioneDipendenti({
          action: "lista",
        });

      setDipendenti(
        data.dipendenti || []
      );
    } catch (error) {
      console.error(error);

      setMessage(error.message);
      setSuccess(false);
    }
  }

  /*
    ========================================
    ASSUMI
    ========================================
  */

  async function assumiDipendente(e) {
    e.preventDefault();

    if (saving) return;

    setMessage("");
    setSuccess(false);

    if (!nome.trim()) {
      setMessage(
        "Inserisci il nome del dipendente."
      );
      return;
    }

    if (!username.trim()) {
      setMessage(
        "Inserisci uno username."
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "La password deve avere almeno 6 caratteri."
      );
      return;
    }

    const percentualeNumero =
      Number(percentuale);

    if (
      percentualeNumero < 0 ||
      percentualeNumero > 100
    ) {
      setMessage(
        "La percentuale deve essere compresa tra 0 e 100."
      );
      return;
    }

    setSaving(true);

    try {
      const data =
        await callGestioneDipendenti({
          action: "assumi",

          nome:
            nome.trim(),

          username:
            username
              .trim()
              .toLowerCase(),

          password,

          ruolo_lavorativo:
            ruoloLavorativo.trim() ||
            "Dipendente",

          percentuale_stipendio:
            percentualeNumero,
        });

      setNome("");
      setUsername("");
      setPassword("");
      setRuoloLavorativo(
        "Dipendente"
      );
      setPercentuale(0);

      setMessage(
        data.message ||
          "Dipendente assunto con successo."
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(error.message);
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  /*
    ========================================
    LICENZIA
    ========================================
  */

  async function licenziaDipendente(dipendente) {
    if (actionId) return;

    const conferma =
      window.confirm(
        `Vuoi licenziare ${dipendente.nome}?\n\n` +
          `Username: ${dipendente.username || "-"}\n` +
          `Ruolo: ${dipendente.ruolo_lavorativo || "Dipendente"}\n\n` +
          `Non potrà più accedere al gestionale.\n` +
          `Le sue fatture e lo storico NON verranno cancellati.`
      );

    if (!conferma) return;

    setActionId(dipendente.id);
    setMessage("");
    setSuccess(false);

    try {
      const data =
        await callGestioneDipendenti({
          action: "licenzia",
          employee_id:
            dipendente.id,
        });

      setMessage(
        data.message ||
          "Dipendente licenziato."
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(error.message);
      setSuccess(false);
    } finally {
      setActionId(null);
    }
  }

  /*
    ========================================
    RIATTIVA
    ========================================
  */

  async function riattivaDipendente(dipendente) {
    if (actionId) return;

    const conferma =
      window.confirm(
        `Vuoi riassumere ${dipendente.nome}?\n\n` +
          `L'account verrà riattivato e potrà nuovamente accedere al gestionale.`
      );

    if (!conferma) return;

    setActionId(dipendente.id);
    setMessage("");
    setSuccess(false);

    try {
      const data =
        await callGestioneDipendenti({
          action: "riattiva",
          employee_id:
            dipendente.id,
        });

      setMessage(
        data.message ||
          "Dipendente riattivato."
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(error.message);
      setSuccess(false);
    } finally {
      setActionId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
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

        {/* SIDEBAR */}

        <aside className="sidebar">
          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>
            <button
              onClick={() =>
                router.push("/")
              }
            >
              <span className="navIcon">
                ⌂
              </span>
              Dashboard
            </button>

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

            <button className="active">
              <span className="navIcon">
                ♟
              </span>
              Dipendenti
            </button>
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

        {/* CONTENUTO */}

        <section className="content">

          <header>
            <div>
              <p className="eyebrow">
                AQUA BAR
              </p>

              <h2>
                Dipendenti
              </h2>

              <p className="subtitle">
                Gestione del personale
              </p>
            </div>

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
                    "Admin"}
                </strong>

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

          {/* ASSUNZIONE */}

          <div className="employeeCreateCard">

            <div className="employeeSectionTitle">
              <p className="welcomeLabel">
                NUOVA ASSUNZIONE
              </p>

              <h2>
                Assumi dipendente
              </h2>

              <p>
                Crea direttamente le credenziali
                per il nuovo membro dello staff.
              </p>
            </div>

            <form
              className="employeeForm"
              onSubmit={
                assumiDipendente
              }
            >

              <div className="employeeField">
                <label>
                  NOME
                </label>

                <input
                  type="text"
                  placeholder="Es. Mario Rossi"
                  value={nome}
                  onChange={(e) =>
                    setNome(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="employeeField">
                <label>
                  USERNAME
                </label>

                <input
                  type="text"
                  placeholder="Es. mario"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="employeeField">
                <label>
                  PASSWORD INIZIALE
                </label>

                <input
                  type="password"
                  placeholder="Minimo 6 caratteri"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="employeeField">
                <label>
                  RUOLO LAVORATIVO
                </label>

                <input
                  type="text"
                  placeholder="Es. Bartender"
                  value={
                    ruoloLavorativo
                  }
                  onChange={(e) =>
                    setRuoloLavorativo(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="employeeField">
                <label>
                  % STIPENDIO
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    percentuale
                  }
                  onChange={(e) =>
                    setPercentuale(
                      e.target.value
                    )
                  }
                />
              </div>

              <button
                type="submit"
                className="employeeHireButton"
                disabled={saving}
              >
                {saving
                  ? "ASSUNZIONE..."
                  : "+ ASSUMI DIPENDENTE"}
              </button>

            </form>
          </div>

          {/* MESSAGGIO */}

          {message && (
            <div
              className={
                success
                  ? "invoiceMessage success"
                  : "invoiceMessage"
              }
            >
              {message}
            </div>
          )}

          {/* ELENCO */}

          <div className="employeeListCard">

            <div className="employeeListHeader">
              <div>
                <p className="welcomeLabel">
                  PERSONALE
                </p>

                <h2>
                  Dipendenti AQUA BAR
                </h2>
              </div>

              <span>
                {
                  dipendenti.filter(
                    (d) =>
                      d.attivo !== false
                  ).length
                }{" "}
                attivi
              </span>
            </div>

            {dipendenti.length === 0 ? (
              <p className="emptyCart">
                Nessun dipendente trovato.
              </p>
            ) : (
              <div className="employeeList">

                {dipendenti.map(
                  (dipendente) => (

                    <div
                      className={`employeeRow ${
                        dipendente.attivo ===
                        false
                          ? "employeeInactive"
                          : ""
                      }`}
                      key={
                        dipendente.id
                      }
                    >

                      <div className="employeeIdentity">

                        <div className="employeeAvatar">
                          {dipendente.nome
                            ?.charAt(0)
                            .toUpperCase() ||
                            "D"}
                        </div>

                        <div>
                          <strong>
                            {
                              dipendente.nome
                            }
                          </strong>

                          <span>
                            @
                            {dipendente.username ||
                              "nessuno"}
                          </span>
                        </div>

                      </div>

                      <div className="employeeInfo">
                        <small>
                          RUOLO
                        </small>

                        <strong>
                          {dipendente.ruolo ===
                          "admin"
                            ? "Amministratore"
                            : dipendente.ruolo_lavorativo ||
                              "Dipendente"}
                        </strong>
                      </div>

                      <div className="employeeInfo">
                        <small>
                          STIPENDIO
                        </small>

                        <strong>
                          {Number(
                            dipendente.percentuale_stipendio ||
                              0
                          )}
                          %
                        </strong>
                      </div>

                      <div className="employeeInfo">
                        <small>
                          ASSUNTO
                        </small>

                        <strong>
                          {formatDate(
                            dipendente.created_at
                          )}
                        </strong>
                      </div>

                      <div className="employeeStatus">

                        <span
                          className={
                            dipendente.attivo ===
                            false
                              ? "employeeStatusOff"
                              : "employeeStatusOn"
                          }
                        >
                          {dipendente.attivo ===
                          false
                            ? "LICENZIATO"
                            : "ATTIVO"}
                        </span>

                      </div>

                      <div className="employeeActions">

                        {dipendente.ruolo ===
                        "admin" ? (
                          <span className="employeeAdminBadge">
                            ADMIN
                          </span>
                        ) : dipendente.attivo ===
                          false ? (
                          <button
                            className="employeeReactivateButton"
                            onClick={() =>
                              riattivaDipendente(
                                dipendente
                              )
                            }
                            disabled={
                              actionId ===
                              dipendente.id
                            }
                          >
                            {actionId ===
                            dipendente.id
                              ? "ATTENDI..."
                              : "RIASSUMI"}
                          </button>
                        ) : (
                          <button
                            className="employeeFireButton"
                            onClick={() =>
                              licenziaDipendente(
                                dipendente
                              )
                            }
                            disabled={
                              actionId ===
                              dipendente.id
                            }
                          >
                            {actionId ===
                            dipendente.id
                              ? "ATTENDI..."
                              : "LICENZIA"}
                          </button>
                        )}

                      </div>

                    </div>

                  )
                )}

              </div>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}
