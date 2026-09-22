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

  const totale =
    (Number(kitCibo || 0) + Number(kitBevande || 0)) *
    PREZZO_KIT;

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

  function handleCiboChange(e) {
    const value = e.target.value;

    setMessage("");
    setSuccess(false);

    if (value === "") {
      setKitCibo("");
      return;
    }

    const number = Math.max(
      0,
      Math.floor(Number(value))
    );

    setKitCibo(number);
  }

  function handleBevandeChange(e) {
    const value = e.target.value;

    setMessage("");
    setSuccess(false);

    if (value === "") {
      setKitBevande("");
      return;
    }

    const number = Math.max(
      0,
      Math.floor(Number(value))
    );

    setKitBevande(number);
  }

  async function confirmImport() {
    if (saving) return;

    setMessage("");
    setSuccess(false);

    const cibo = Number(kitCibo || 0);
    const bevande = Number(kitBevande || 0);

    if (cibo === 0 && bevande === 0) {
      setMessage("Inserisci almeno una quantità.");
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
        p_kit_cibo: cibo,
        p_kit_bevande: bevande,
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

    const totalePagato = Number(
      data?.totale || totale
    );

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
              <p className="eyebrow">
                AQUA BAR
              </p>

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
              <span>
                FONDO CASSA DISPONIBILE
              </span>

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

            {/* KIT CIBO */}

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

              <label className="quantityLabel">
                QUANTITÀ
              </label>

              <input
                className="quantityInput"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={kitCibo}
                onChange={handleCiboChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />

              <div className="kitSubtotal">

                <span>Subtotale</span>

                <strong>
                  $
                  {formatMoney(
                    Number(kitCibo || 0) *
                      PREZZO_KIT
                  )}
                </strong>

              </div>

            </div>

            {/* KIT BEVANDE */}

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

              <label className="quantityLabel">
                QUANTITÀ
              </label>

              <input
                className="quantityInput"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={kitBevande}
                onChange={handleBevandeChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />

              <div className="kitSubtotal">

                <span>Subtotale</span>

                <strong>
                  $
                  {formatMoney(
                    Number(kitBevande || 0) *
                      PREZZO_KIT
                  )}
                </strong>

              </div>

            </div>

          </div>

          {/* RIEPILOGO */}

          <div className="importSummary">

            <div>

              <p className="welcomeLabel">
                RIEPILOGO IMPORT
              </p>

              <div className="importSummaryRow">
                <span>Kit Cibo</span>
                <strong>
                  {Number(kitCibo || 0)}
                </strong>
              </div>

              <div className="importSummaryRow">
                <span>Kit Bevande</span>
                <strong>
                  {Number(kitBevande || 0)}
                </strong>
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
                  (Number(kitCibo || 0) === 0 &&
                    Number(kitBevande || 0) === 0)
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
