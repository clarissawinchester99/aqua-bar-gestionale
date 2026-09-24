"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DipendentiPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
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

      if (profileError) {
        console.error(profileError);
        setMessage("Errore nel caricamento del profilo.");
        return;
      }

      if (profilo?.ruolo !== "admin") {
        router.replace("/");
        return;
      }

      setProfile(profilo);

      /*
        Per questo primo test leggiamo direttamente
        la tabella profiles.

        Se non è ancora consentito dalle policy RLS,
        Supabase ci mostrerà l'errore preciso e lo
        sistemeremo nel prossimo passaggio.
      */

      const { data, error } = await supabase
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
        console.error("Errore dipendenti:", error);

        setMessage(
          "Non riesco ancora a leggere l'elenco dipendenti."
        );

        return;
      }

      setDipendenti(data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        "Errore durante il caricamento."
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <main>
      <div className="overlay">

        <aside className="sidebar">

          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>

            <button
              onClick={() => router.push("/")}
            >
              <span className="navIcon">⌂</span>
              Dashboard
            </button>

            <button
              onClick={() =>
                router.push("/fatture")
              }
            >
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button
              onClick={() =>
                router.push("/import")
              }
            >
              <span className="navIcon">◇</span>
              Import
            </button>

            <button
              onClick={() =>
                router.push("/stipendi")
              }
            >
              <span className="navIcon">♙</span>
              Stipendi
            </button>

            <button className="active">
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
              <p className="eyebrow">
                AQUA BAR
              </p>

              <h2>Dipendenti</h2>

              <p className="subtitle">
                Gestione del personale
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
                  {profile?.nome || "Admin"}
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

          {message && (
            <div className="invoiceMessage">
              {message}
            </div>
          )}

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
                      dipendente.attivo !== false
                  ).length
                } attivi
              </span>

            </div>

            {dipendenti.length === 0 ? (

              <p className="emptyCart">
                Nessun dipendente trovato.
              </p>

            ) : (

              <div className="employeeList">

                {dipendenti.map((dipendente) => (

                  <div
                    className={`employeeRow ${
                      dipendente.attivo === false
                        ? "employeeInactive"
                        : ""
                    }`}
                    key={dipendente.id}
                  >

                    <div className="employeeIdentity">

                      <div className="employeeAvatar">
                        {dipendente.nome
                          ?.charAt(0)
                          .toUpperCase() || "D"}
                      </div>

                      <div>
                        <strong>
                          {dipendente.nome}
                        </strong>

                        <span>
                          @{dipendente.username || "-"}
                        </span>
                      </div>

                    </div>

                    <div className="employeeInfo">
                      <small>RUOLO</small>

                      <strong>
                        {dipendente.ruolo === "admin"
                          ? "Amministratore"
                          : dipendente.ruolo_lavorativo ||
                            "Dipendente"}
                      </strong>
                    </div>

                    <div className="employeeInfo">
                      <small>STIPENDIO</small>

                      <strong>
                        {Number(
                          dipendente.percentuale_stipendio || 0
                        )}%
                      </strong>
                    </div>

                    <div className="employeeStatus">

                      <span
                        className={
                          dipendente.attivo === false
                            ? "employeeStatusOff"
                            : "employeeStatusOn"
                        }
                      >
                        {dipendente.attivo === false
                          ? "LICENZIATO"
                          : "ATTIVO"}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

      </div>
    </main>
  );
}
