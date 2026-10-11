"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function GestioneImportPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("nome, ruolo, attivo")
        .eq("id", user.id)
        .single();

      if (
        error ||
        !data ||
        data.attivo !== true ||
        data.ruolo !== "admin"
      ) {
        router.replace("/");
        return;
      }

      setProfile(data);
      await loadProducts();
    } catch (error) {
      console.error("Errore Gestione Import:", error);
      setMessage("Impossibile caricare il catalogo import.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("import_products")
      .select("id, nome, prezzo, attivo")
      .order("id", { ascending: true });

    if (error) throw error;

    setProducts(data || []);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      maximumFractionDigits: 2,
    });
  }

  function parsePrice(value) {
    const text = String(value).trim().replace(",", ".");

    if (!text) return null;

    const number = Number(text);

    if (!Number.isFinite(number) || number < 0) {
      return null;
    }

    return Math.round(number * 100) / 100;
  }

  function showMessage(text, isSuccess = false) {
    setMessage(text);
    setSuccess(isSuccess);
  }

  async function addProduct(event) {
    event.preventDefault();

    if (saving) return;

    const nome = newName.trim();
    const prezzo = parsePrice(newPrice);

    if (!nome) {
      showMessage("Inserisci il nome del prodotto.");
      return;
    }

    if (prezzo === null) {
      showMessage("Inserisci un prezzo valido.");
      return;
    }

    setSaving(true);
    showMessage("");

    try {
      const { error } = await supabase
        .from("import_products")
        .insert({
          nome,
          prezzo,
          attivo: true,
        });

      if (error) throw error;

      setNewName("");
      setNewPrice("");

      await loadProducts();

      showMessage(
        `Prodotto "${nome}" aggiunto correttamente.`,
        true
      );
    } catch (error) {
      console.error("Errore aggiunta:", error);
      showMessage(
        `Impossibile aggiungere il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditName(product.nome);
    setEditPrice(String(product.prezzo));
    showMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  }

  async function saveEdit(product) {
    if (saving) return;

    const nome = editName.trim();
    const prezzo = parsePrice(editPrice);

    if (!nome) {
      showMessage("Inserisci il nome del prodotto.");
      return;
    }

    if (prezzo === null) {
      showMessage("Inserisci un prezzo valido.");
      return;
    }

    setSaving(true);
    showMessage("");

    try {
      const { error } = await supabase
        .from("import_products")
        .update({ nome, prezzo })
        .eq("id", product.id);

      if (error) throw error;

      await loadProducts();
      cancelEdit();

      showMessage(
        `Prodotto "${nome}" aggiornato.`,
        true
      );
    } catch (error) {
      console.error("Errore modifica:", error);
      showMessage(
        `Impossibile modificare il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    if (saving) return;

    const nuovoStato = product.attivo === false;

    const conferma = window.confirm(
      nuovoStato
        ? `Vuoi riattivare "${product.nome}"?`
        : `Vuoi disattivare "${product.nome}"?`
    );

    if (!conferma) return;

    setSaving(true);
    showMessage("");

    try {
      const { error } = await supabase
        .from("import_products")
        .update({ attivo: nuovoStato })
        .eq("id", product.id);

      if (error) throw error;

      await loadProducts();

      showMessage(
        nuovoStato
          ? `"${product.nome}" riattivato.`
          : `"${product.nome}" disattivato.`,
        true
      );
    } catch (error) {
      console.error("Errore aggiornamento:", error);
      showMessage(
        `Impossibile aggiornare il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loadingText">AQUA BAR</div>
      </main>
    );
  }

  if (!profile) return null;

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

            <button onClick={() => router.push("/stipendi")}>
              <span className="navIcon">♙</span>
              Stipendi
            </button>

            <button onClick={() => router.push("/dipendenti")}>
              <span className="navIcon">♟</span>
              Dipendenti
            </button>

            <button onClick={() => router.push("/admin/catalogo")}>
              <span className="navIcon">▦</span>
              Gestione Catalogo
            </button>

            <button className="active">
              <span className="navIcon">◇</span>
              Gestione Import
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
              <h2>Gestione Import</h2>
              <p className="subtitle">
                Gestisci prodotti e prezzi delle forniture
              </p>
            </div>

            <div className="user">
              <div className="avatar">
                {profile.nome?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="userInfo">
                <strong>{profile.nome || "Admin"}</strong>
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

          <div className="invoicePanel">
            <p className="welcomeLabel">FORNITURE</p>
            <h2>Aggiungi prodotto import</h2>

            <form className="invoiceForm" onSubmit={addProduct}>
              <label>Nome prodotto</label>
              <input
                type="text"
                placeholder="Es. Ghiaccio"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />

              <label>Prezzo d'acquisto ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Es. 100"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />

              <button
                type="submit"
                className="invoicePrimaryButton"
                disabled={saving}
              >
                {saving
                  ? "SALVATAGGIO..."
                  : "+ AGGIUNGI PRODOTTO"}
              </button>
            </form>
          </div>

          {message && (
            <div
              className={
                success
                  ? "invoiceMessage success"
                  : "invoiceMessage"
              }
              style={{ marginTop: "20px" }}
            >
              {message}
            </div>
          )}

          <div
            className="invoiceHistory"
            style={{ marginTop: "25px" }}
          >
            <div className="invoiceHistoryHeader">
              <div>
                <p className="welcomeLabel">
                  AMMINISTRAZIONE
                </p>
                <h2>Catalogo Import</h2>
              </div>

              <span>{products.length} prodotti</span>
            </div>

            {products.length === 0 ? (
              <p className="emptyCart">
                Nessun prodotto presente.
              </p>
            ) : (
              <div className="invoiceHistoryList">
                {products.map((product) => (
                  <div
                    className="invoiceHistoryItem"
                    key={product.id}
                    style={{
                      opacity: product.attivo ? 1 : 0.65,
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    {editingId === product.id ? (
                      <>
                        <div
                          className="invoiceForm"
                          style={{
                            flex: "1 1 250px",
                            minWidth: 0,
                          }}
                        >
                          <label>Nome prodotto</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) =>
                              setEditName(e.target.value)
                            }
                          />

                          <label>Prezzo ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) =>
                              setEditPrice(e.target.value)
                            }
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className="invoicePrimaryButton"
                            disabled={saving}
                            onClick={() => saveEdit(product)}
                          >
                            SALVA
                          </button>

                          <button
                            className="cancelInvoiceButton"
                            disabled={saving}
                            onClick={cancelEdit}
                          >
                            ANNULLA
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="invoiceHistoryMain"
                          style={{ flex: "1 1 220px" }}
                        >
                          <div>
                            <strong>{product.nome}</strong>
                            <p>
                              {product.attivo
                                ? "Prodotto attivo"
                                : "Prodotto disattivato"}
                            </p>
                          </div>
                        </div>

                        <div className="invoiceHistoryTotal">
                          <small>PREZZO ACQUISTO</small>
                          <strong>
                            ${formatMoney(product.prezzo)}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className="invoicePrimaryButton"
                            disabled={saving}
                            onClick={() => startEdit(product)}
                          >
                            MODIFICA
                          </button>

                          <button
                            className="cancelInvoiceButton"
                            disabled={saving}
                            onClick={() => toggleProduct(product)}
                          >
                            {product.attivo
                              ? "DISATTIVA"
                              : "RIATTIVA"}
                          </button>
                        </div>
                      </>
                    )}
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
