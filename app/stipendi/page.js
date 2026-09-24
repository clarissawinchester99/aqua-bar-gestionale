"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function StipendiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [stipendi, setStipendi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("nome, ruolo")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      router.replace("/");
      return;
    }

    // Solo gli amministratori possono entrare
    if (profileData.ruolo !== "admin") {
      router.replace("/");
      return;
    }

    setProfile(profileData);

    await loadStipendi();

    setLoading(false);
  }

  async function loadStipendi() {
    const { data, error } =
      await supabase.rpc("get_stipendi");

    if (error) {
      console.error(
        "Errore stipendi:",
        error
      );

      setMessage(
        "Errore durante il caricamento degli stipendi."
      );

      return;
    }

    setStipendi(data || []);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  }

  function formatPercentage(value) {
    return Number(value || 0).toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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

  const totaleFatturato = stipendi.reduce(
    (sum, dipendente) =>
      sum +
      Number(
        dipendente.fatturato || 0
      ),
    0
  );

  const totaleStipendi = stipendi.reduce(
    (sum, dipendente) =>
      sum +
      Number(
        dipendente.stipendio || 0
      ),
    0
  );

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

            <button className="active">
              <span className="navIcon">
                ♙
              </span>

              Stipendi
            </button>

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

          {/* =========================
              HEADER
          ========================= */}

          <header>

            <div>

              <p className="eyebrow">
                AMMINISTRAZIONE
              </p>

              <h2>
                Stipendi
              </h2>

              <p className="subtitle">
                Gestione automatica degli stipendi
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
                  {profile?.nome}
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

          {/* =========================
              CARDS
          ========================= */}

          <div className="salaryCards">

            {/* DIPENDENTI */}

            <div className="card">

              <div className="cardIcon">
                ♙
              </div>

              <div>

                <span>
                  DIPENDENTI
                </span>

                <h3>
                  {stipendi.length}
                </h3>

                <p>
                  Dipendenti registrati
                </p>

              </div>

            </div>

            {/* FATTURATO */}

            <div className="card">

              <div className="cardIcon">
                $
              </div>

              <div>

                <span>
                  FATTURATO TOTALE
                </span>

                <h3>
                  $
                  {formatMoney(
                    totaleFatturato
                  )}
                </h3>

                <p>
                  Fatture non annullate
                </p>

              </div>

            </div>

            {/* STIPENDI */}

            <div className="card">

              <div className="cardIcon">
                %
              </div>

              <div>

                <span>
                  STIPENDI TOTALI
                </span>

                <h3>
                  $
                  {formatMoney(
                    totaleStipendi
                  )}
                </h3>

                <p>
                  Totale da corrispondere
                </p>

              </div>

            </div>

          </div>

          {/* =========================
              MESSAGGI
          ========================= */}

          {message && (

            <div className="salaryMessage">
              {message}
            </div>

          )}

          {/* =========================
              PANNELLO STIPENDI
          ========================= */}

          <div className="salaryPanel">

            <div className="salaryPanelHeader">

              <div>

                <p className="welcomeLabel">
                  PERSONALE
                </p>

                <h2>
                  Stipendi Dipendenti
                </h2>

                <p>
                  Ruolo e percentuale vengono
                  assegnati automaticamente
                  dalla gestione Dipendenti.
                </p>

              </div>

              <span>
                {stipendi.length} dipendenti
              </span>

            </div>

            {/* =========================
                INTESTAZIONE
            ========================= */}

            <div className="salaryTableHeader">

              <span>
                DIPENDENTE
              </span>

              <span>
                RUOLO
              </span>

              <span>
                PERCENTUALE
              </span>

              <span>
                FATTURATO
              </span>

              <span>
                STIPENDIO
              </span>

              <span></span>

            </div>

            {/* =========================
                LISTA
            ========================= */}

            <div className="salaryList">

              {stipendi.length === 0 ? (

                <div className="emptyCart">
                  Nessun dipendente registrato.
                </div>

              ) : (

                stipendi.map(
                  (dipendente) => (

                    <div
                      className="salaryRow"
                      key={
                        dipendente.employee_id
                      }
                    >

                      {/* DIPENDENTE */}

                      <div className="salaryEmployee">

                        <div className="salaryAvatar">

                          {dipendente.nome
                            ?.charAt(0)
                            .toUpperCase() ||
                            "D"}

                        </div>

                        <strong>
                          {dipendente.nome}
                        </strong>

                      </div>

                      {/* RUOLO */}

                      <div className="salaryRoleDisplay">

                        <span>
                          {dipendente.ruolo_lavorativo ||
                            "Dipendente"}
                        </span>

                      </div>

                      {/* PERCENTUALE */}

                      <div className="salaryPercentageDisplay">

                        <strong>
                          {formatPercentage(
                            dipendente.percentuale
                          )}
                          %
                        </strong>

                      </div>

                      {/* FATTURATO */}

                      <strong className="salaryRevenue">

                        $
                        {formatMoney(
                          dipendente.fatturato
                        )}

                      </strong>

                      {/* STIPENDIO */}

                      <strong className="salaryAmount">

                        $
                        {formatMoney(
                          dipendente.stipendio
                        )}

                      </strong>

                      {/* AUTOMATICO */}

                      <div className="salaryAutoBadge">
                        AUTO
                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
