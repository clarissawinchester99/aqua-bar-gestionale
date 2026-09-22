"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const PREZZO_KIT = 100;

export default function ImportPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [saldo, setSaldo] = useState(0);

  const [kitCibo, setKitCibo] = useState(0);
  const [kitBevande, setKitBevande] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const totale = (kitCibo + kitBevande) * PREZZO_KIT;

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("nome, ruolo")
        .eq("id", user.id)
        .single();

    if (profileError) {
      console.error("Errore profilo:", profileError);
    } else {
      setProfile(profileData);
    }

    await loadSaldo();

    setLoading(false);
  }

  async function loadSaldo() {
    const { data, error } = await supabase
      .from("company_account")
      .select("saldo")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Errore fondo cassa:", error);
      return;
    }

    setSaldo(Number(data?.saldo) || 0);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function changeQuantity(type, amount) {
    setMessage("");
    setSuccess(false);

    if (type === "cibo") {
      setKitCibo((current) =>
        Math.max(0, current + amount)
      );
    }

    if (type === "bevande") {
      setKitBevande((current) =>
        Math.max(0, current + amount)
      );
    }
  }

  async function confirmImport() {
    if (saving) return;

    setMessage("");
    setSuccess(false);

    if (kitCibo === 0 && kitBevande === 0) {
      setMessage("Seleziona almeno un kit.");
      return;
    }

    if (totale > saldo) {
      setMessage("Fondo cassa insufficiente.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc(
      "registra_import",
      {
        p_kit_cibo: kitCibo,
        p_kit_bevande: kitBevande,
      }
    );

    if (error) {
      console.error("Errore import:", error);

      if (
        error.message
          ?.toLowerCase()
          .includes("fondo cassa insufficiente")
      ) {
        setMessage("Fondo cassa insufficiente.");
      } else {
        setMessage(
          "Si è verificato un errore durante l'import."
        );
      }

      setSaving(false);
      return;
    }

    const nuovoSaldo = Number(data?.nuovo_saldo);

    if (!Number.isNaN(nuovoSaldo)) {
      setSaldo(nuovoSaldo);
    } else {
      await loadSaldo();
    }

    const totalePagato = Number(data?.totale || totale);

    setKitCibo(0);
    setKitBevande(0);

    setMessage(
      `Import registrato con successo. $${formatMoney(
        totalePagato
      )} scalati dal Fondo Cassa.`
    );

    setSuccess(true);
    setSaving(false);
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

            <button onClick={() => router.push("/")}>
              <span className="navIcon">⌂</span>
              Dashboard
            </button>

            <button
              onClick={() => router.push("/fatture")}
            >
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button className="active">
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
              <p className="eyebrow">AQUA BAR</p>

              <h2>Import</h2>

              <p className="subtitle">
                Gestisci le forniture del locale
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

          <div className="importTopCard">

            <div>
              <span>FONDO CASSA DISPONIBILE</span>

              <h3>
                ${formatMoney(saldo)}
              </h3>
            </div>

            <p>
              Gli import vengono pagati utilizzando
              il conto aziendale AQUA BAR.
            </p>

          </div>

          <div className="importGrid">

            <div className="importKitCard">

              <div className="importKitIcon">
                🍽
              </div>

              <p className="welcomeLabel">
                FORNITURE
              </p>

              <h2>Kit Cibo</h2>

              <p className="importPrice">
                ${formatMoney(PREZZO_KIT)}
                <span> / kit</span>
              </p>

              <div className="quantityControl">

                <button
                  onClick={() =>
                    changeQuantity("cibo", -1)
                  }
                >
                  −
                </button>

                <strong>
                  {kitCibo}
                </strong>

                <button
                  onClick={() =>
                    changeQuantity("cibo", 1)
                  }
                >
                  +
                </button>

              </div>

              <div className="kitSubtotal">

                <span>Subtotale</span>

                <strong>
                  $
                  {formatMoney(
                    kitCibo * PREZZO_KIT
                  )}
                </strong>

              </div>

            </div>

            <div className="importKitCard">

              <div className="importKitIcon">
                🍸
              </div>

              <p className="welcomeLabel">
                FORNITURE
              </p>

              <h2>Kit Bevande</h2>

              <p className="importPrice">
                ${formatMoney(PREZZO_KIT)}
                <span> / kit</span>
              </p>

              <div className="quantityControl">

                <button
                  onClick={() =>
                    changeQuantity("bevande", -1)
                  }
                >
                  −
                </button>

                <strong>
                  {kitBevande}
                </strong>

                <button
                  onClick={() =>
                    changeQuantity("bevande", 1)
                  }
                >
                  +
                </button>

              </div>

              <div className="kitSubtotal">

                <span>Subtotale</span>

                <strong>
                  $
                  {formatMoney(
                    kitBevande * PREZZO_KIT
                  )}
                </strong>

              </div>

            </div>

          </div>

          <div className="importSummary">

            <div>

              <p className="welcomeLabel">
                RIEPILOGO IMPORT
              </p>

              <div className="importSummaryRow">
                <span>Kit Cibo</span>
                <strong>{kitCibo}</strong>
              </div>

              <div className="importSummaryRow">
                <span>Kit Bevande</span>
                <strong>{kitBevande}</strong>
              </div>

              <div className="importTotal">

                <span>TOTALE</span>

                <strong>
                  ${formatMoney(totale)}
                </strong>

              </div>

              <button
                className="importConfirmButton"
                onClick={confirmImport}
                disabled={
                  saving ||
                  (kitCibo === 0 &&
                    kitBevande === 0)
                }
              >
                {saving
                  ? "REGISTRAZIONE..."
                  : "CONFERMA IMPORT"}
              </button>

            </div>

          </div>

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

        </section>

      </div>
    </main>
  );
}
