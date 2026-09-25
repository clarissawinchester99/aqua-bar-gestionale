"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const RUOLI = {
  Proprietario: 45,
  Direttore: 40,
  "Vice-Direttore": 30,
  Barista: 25,
  Dipendente: 20,
};

export default function DipendentiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [dipendenti, setDipendenti] = useState([]);

  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ruoloLavorativo, setRuoloLavorativo] =
    useState("Dipendente");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const percentuale =
    RUOLI[ruoloLavorativo] ?? 20;

  useEffect(() => {
    loadPage();
  }, []);

  // ============================================
  // CARICAMENTO PAGINA
  // ============================================

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

      const {
        data: profilo,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("nome, ruolo, attivo")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profilo) {
        console.error(profileError);

        setMessage(
          "Errore nel caricamento del profilo."
        );

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
      console.error(error);

      setMessage(
        "Errore durante il caricamento."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // CARICA DIPENDENTI
  // ============================================

  async function loadDipendenti() {
    const { data, error } =
      await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          username,
          ruolo,
          ruolo_lavorativo,
          percentuale_stipendio,
          attivo,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Errore dipendenti:",
        error
      );

      setMessage(
        "Non riesco a leggere l'elenco dipendenti."
      );

      return;
    }

    setDipendenti(data || []);
  }

  // ============================================
  // CHIAMATA EDGE FUNCTION
  // ============================================

  async function gestioneDipendente(body) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error(
        "Sessione non valida."
      );
    }

    const { data, error } =
      await supabase.functions.invoke(
        "gestione-dipendenti",
        {
          body,
        }
      );

    if (error) {
      console.error(
        "Errore Edge Function:",
        error
      );

      let messaggio =
        error.message ||
        "Errore durante l'operazione.";

      try {
        if (
          error.context &&
          typeof error.context.json ===
            "function"
        ) {
          const result =
            await error.context.json();

          if (result?.error) {
            messaggio =
              result.error;
          } else if (
            result?.message
          ) {
            messaggio =
              result.message;
          }
        } else if (
          error.context?.error
        ) {
          messaggio =
            error.context.error;
        } else if (
          error.context?.message
        ) {
          messaggio =
            error.context.message;
        }
      } catch (contextError) {
        console.error(
          "Errore lettura dettaglio:",
          contextError
        );
      }

      throw new Error(messaggio);
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          "Operazione non riuscita."
      );
    }

    return data;
  }

  // ============================================
  // ASSUMI DIPENDENTE
  // ============================================

  async function assumiDipendente(e) {
    e.preventDefault();

    if (saving) return;

    setMessage("");
    setSuccess(false);

    const cleanNome =
      nome.trim();

    const cleanUsername =
      username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    const cleanRuolo =
      ruoloLavorativo;

    const percentualeNumero =
      RUOLI[cleanRuolo];

    if (!cleanNome) {
      setMessage(
        "Inserisci il nome del dipendente."
      );
      return;
    }

    if (!cleanUsername) {
      setMessage(
        "Inserisci uno username."
      );
      return;
    }

    if (
      !/^[a-z0-9._-]+$/.test(
        cleanUsername
      )
    ) {
      setMessage(
        "Lo username può contenere solo lettere, numeri, punto, trattino e underscore."
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "La password deve avere almeno 6 caratteri."
      );
      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        RUOLI,
        cleanRuolo
      )
    ) {
      setMessage(
        "Seleziona un ruolo valido."
      );
      return;
    }

    setSaving(true);

    try {
      const result =
        await gestioneDipendente({
          action: "assumi",

          nome: cleanNome,

          username:
            cleanUsername,

          password,

          ruolo_lavorativo:
            cleanRuolo,

          percentuale_stipendio:
            percentualeNumero,
        });

      setNome("");
      setUsername("");
      setPassword("");

      setRuoloLavorativo(
        "Dipendente"
      );

      setMessage(
        result.message ||
          "Dipendente assunto con successo."
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante l'assunzione."
      );

      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // LICENZIA
  // ============================================

  async function licenziaDipendente(
    dipendente
  ) {
    if (actionId) return;

    const conferma =
      window.confirm(
        `Vuoi licenziare ${dipendente.nome}?\n\n` +
          `Username: @${dipendente.username || "-"}\n` +
          `Ruolo: ${
            dipendente.ruolo_lavorativo ||
            "Dipendente"
          }\n\n` +
          `Non potrà più effettuare il login.\n` +
          `Le sue fatture e lo storico rimarranno salvati.`
      );

    if (!conferma) return;

    setActionId(
      dipendente.id
    );

    setMessage("");
    setSuccess(false);

    try {
      const result =
        await gestioneDipendente({
          action: "licenzia",

          employee_id:
            dipendente.id,
        });

      setMessage(
        result.message ||
          `${dipendente.nome} è stato licenziato.`
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante il licenziamento."
      );

      setSuccess(false);
    } finally {
      setActionId(null);
    }
  }

  // ============================================
  // RIASSUMI
  // ============================================

  async function riattivaDipendente(
    dipendente
  ) {
    if (actionId) return;

    const conferma =
      window.confirm(
        `Vuoi riassumere ${dipendente.nome}?\n\n` +
          `L'account verrà riattivato e potrà nuovamente accedere al gestionale.`
      );

    if (!conferma) return;

    setActionId(
      dipendente.id
    );

    setMessage("");
    setSuccess(false);

    try {
      const result =
        await gestioneDipendente({
          action: "riattiva",

          employee_id:
            dipendente.id,
        });

      setMessage(
        result.message ||
          `${dipendente.nome} è stato riattivato.`
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante la riattivazione."
      );

      setSuccess(false);
    } finally {
      setActionId(null);
    }
  }

  // ============================================
  // ELIMINA DEFINITIVAMENTE
  // ============================================

  async function eliminaDipendente(
    dipendente
  ) {
    if (actionId) return;

    const primaConferma =
      window.confirm(
        `ATTENZIONE!\n\n` +
          `Stai per eliminare definitivamente ${dipendente.nome}.\n\n` +
          `Username: @${dipendente.username || "-"}\n` +
          `Ruolo: ${
            dipendente.ruolo_lavorativo ||
            "Dipendente"
          }\n\n` +
          `L'account verrà eliminato definitivamente.\n\n` +
          `Le fatture e gli import già registrati rimarranno nello storico.\n\n` +
          `Vuoi continuare?`
      );

    if (!primaConferma) {
      return;
    }

    const secondaConferma =
      window.confirm(
        `ULTIMA CONFERMA\n\n` +
          `Vuoi DAVVERO eliminare definitivamente ${dipendente.nome}?\n\n` +
          `Questa operazione NON può essere annullata.\n\n` +
          `Premi OK per procedere.`
      );

    if (!secondaConferma) {
      return;
    }

    setActionId(
      dipendente.id
    );

    setMessage("");
    setSuccess(false);

    try {
      const result =
        await gestioneDipendente({
          action: "elimina",

          employee_id:
            dipendente.id,
        });

      setMessage(
        result.message ||
          `${dipendente.nome} è stato eliminato definitivamente.`
      );

      setSuccess(true);

      await loadDipendenti();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante l'eliminazione definitiva."
      );

      setSuccess(false);
    } finally {
      setActionId(null);
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async function logout() {
    await supabase.auth.signOut();

    router.replace(
      "/login"
    );
  }

  // ============================================
  // DATA
  // ============================================

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleDateString(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="loadingPage">

        <div className="loadingText">
          AQUA BAR
        </div>

      </main>
    );
  }

  // ============================================
  // PAGINA
  // ============================================

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
                router.push(
                  "/fatture"
                )
              }
            >
              <span className="navIcon">
                ▤
              </span>

              Fatture
            </button>

            <button
              onClick={() =>
                router.push(
                  "/import"
                )
              }
            >
              <span className="navIcon">
                ◇
              </span>

              Import
            </button>

            <button
              onClick={() =>
                router.push(
                  "/stipendi"
                )
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

          {/* ==================================
              NUOVA ASSUNZIONE
          ================================== */}

          <div className="employeeCreateCard">

            <div className="employeeSectionTitle">

              <p className="welcomeLabel">
                NUOVA ASSUNZIONE
              </p>

              <h2>
                Assumi dipendente
              </h2>

              <p>
                Crea le credenziali di accesso
                per un nuovo membro dello staff.
              </p>

            </div>

            <form
              className="employeeForm"
              onSubmit={
                assumiDipendente
              }
            >

              {/* NOME */}

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

              {/* USERNAME */}

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
                  autoComplete="off"
                  required
                />

              </div>

              {/* PASSWORD */}

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
                  autoComplete="new-password"
                  required
                />

              </div>

              {/* RUOLO */}

              <div className="employeeField">

                <label>
                  RUOLO LAVORATIVO
                </label>

                <select
                  value={
                    ruoloLavorativo
                  }
                  onChange={(e) =>
                    setRuoloLavorativo(
                      e.target.value
                    )
                  }
                >

                  <option value="Proprietario">
                    Proprietario
                  </option>

                  <option value="Direttore">
                    Direttore
                  </option>

                  <option value="Vice-Direttore">
                    Vice-Direttore
                  </option>

                  <option value="Barista">
                    Barista
                  </option>

                  <option value="Dipendente">
                    Dipendente
                  </option>

                </select>

              </div>

              {/* PERCENTUALE */}

              <div className="employeeField">

                <label>
                  % STIPENDIO
                </label>

                <input
                  type="text"
                  value={`${percentuale}%`}
                  readOnly
                  title="La percentuale viene assegnata automaticamente in base al ruolo."
                />

              </div>

              {/* ASSUMI */}

              <button
                type="submit"
                className="employeeHireButton"
                disabled={saving}
              >

                {saving
                  ? "ASSUNZIONE IN CORSO..."
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

          {/* ==================================
              ELENCO DIPENDENTI
          ================================== */}

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
                    (dipendente) =>
                      dipendente.attivo !==
                      false
                  ).length
                }{" "}

                attivi

              </span>

            </div>

            {dipendenti.length ===
            0 ? (

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

                      {/* IDENTITÀ */}

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
                              "-"}
                          </span>

                        </div>

                      </div>

                      {/* RUOLO */}

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

                      {/* STIPENDIO */}

                      <div className="employeeInfo">

                        <small>
                          STIPENDIO
                        </small>

                        <strong>

                          {Number(
                            dipendente.percentuale_stipendio ||
                              0
                          )}%

                        </strong>

                      </div>

                      {/* DATA */}

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

                      {/* STATO */}

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

                      {/* ==================================
                          AZIONI
                      ================================== */}

                      <div className="employeeActions">

                        {dipendente.ruolo ===
                        "admin" ? (

                          <span className="employeeAdminBadge">
                            ADMIN
                          </span>

                        ) : (

                          <div
                            style={{
                              display:
                                "flex",

                              flexDirection:
                                "column",

                              gap: "8px",

                              minWidth:
                                "170px",
                            }}
                          >

                            {/* LICENZIA / RIASSUMI */}

                            {dipendente.attivo ===
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

                            {/* ELIMINA DEFINITIVAMENTE */}

                            <button
                              onClick={() =>
                                eliminaDipendente(
                                  dipendente
                                )
                              }
                              disabled={
                                actionId ===
                                dipendente.id
                              }
                              style={{
                                background:
                                  "rgba(170, 20, 20, 0.18)",

                                border:
                                  "1px solid rgba(255, 70, 70, 0.70)",

                                color:
                                  "#ff6666",

                                borderRadius:
                                  "8px",

                                padding:
                                  "9px 12px",

                                fontSize:
                                  "10px",

                                fontWeight:
                                  "800",

                                letterSpacing:
                                  "0.4px",

                                cursor:
                                  actionId ===
                                  dipendente.id
                                    ? "not-allowed"
                                    : "pointer",

                                opacity:
                                  actionId ===
                                  dipendente.id
                                    ? 0.5
                                    : 1,

                                width: "100%",
                              }}
                            >

                              {actionId ===
                              dipendente.id
                                ? "ATTENDI..."
                                : "ELIMINA DEFINITIVAMENTE"}

                            </button>

                          </div>

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
