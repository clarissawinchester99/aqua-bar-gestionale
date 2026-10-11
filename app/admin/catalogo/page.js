
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Sidebar from "../../../components/Sidebar";

export default function GestioneCatalogoPage() {
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

  // ============================================
  // CARICAMENTO PAGINA
  // ============================================

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

      if (error || !data || !data.attivo) {
        router.replace("/");
        return;
      }

      if (data.ruolo !== "admin") {
        router.replace("/");
        return;
      }

      setProfile(data);
      await loadProducts();
    } catch (error) {
      console.error("Errore pagina catalogo:", error);
      setMessage("Impossibile caricare il catalogo.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // CARICAMENTO PRODOTTI
  // ============================================

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id, nome, prezzo, attivo")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    setProducts(data || []);
  }

  // ============================================
  // FORMATTAZIONE PREZZI
  // ============================================

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function parsePrice(value) {
    const text = String(value)
      .trim()
      .replace(",", ".");

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

  // ============================================
  // AGGIUNGI PRODOTTO
  // ============================================

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
        .from("products")
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
      console.error("Errore aggiunta prodotto:", error);

      showMessage(
        `Impossibile aggiungere il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // MODIFICA PRODOTTO
  // ============================================

  function startEdit(product) {
    setEditingId(product.id);
    setEditName(product.nome);

    setEditPrice(
      product.prezzo === null
        ? ""
        : String(product.prezzo)
    );

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
        .from("products")
        .update({ nome, prezzo })
        .eq("id", product.id);

      if (error) throw error;

      await loadProducts();
      cancelEdit();

      showMessage(
        `Prodotto "${nome}" aggiornato correttamente.`,
        true
      );
    } catch (error) {
      console.error("Errore modifica prodotto:", error);

      showMessage(
        `Impossibile modificare il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // ATTIVA / DISATTIVA PRODOTTO
  // ============================================

  async function toggleProduct(product) {
    if (saving) return;

    const nuovaAttivazione =
      product.attivo === false;

    const conferma = window.confirm(
      nuovaAttivazione
        ? `Vuoi riattivare "${product.nome}"?`
        : `Vuoi disattivare "${product.nome}"?\n\nNon comparirà più tra i prodotti selezionabili nelle nuove fatture.`
    );

    if (!conferma) return;

    setSaving(true);
    showMessage("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          attivo: nuovaAttivazione,
        })
        .eq("id", product.id);

      if (error) throw error;

      await loadProducts();

      showMessage(
        nuovaAttivazione
          ? `"${product.nome}" riattivato.`
          : `"${product.nome}" disattivato.`,
        true
      );
    } catch (error) {
      console.error("Errore stato prodotto:", error);

      showMessage(
        `Impossibile aggiornare il prodotto: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ============================================
  // CARICAMENTO
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

  if (!profile) {
    return null;
  }

  // ============================================
  // PAGINA GESTIONE CATALOGO
  // ============================================

  return (
    <main>
      <div className="overlay">

        {/* SIDEBAR UNIFICATA */}
        <Sidebar profile={profile} />

        {/* CONTENUTO */}
        <section className="content">

          {/* HEADER */}
          <header>
            <div>
              <p className="eyebrow">
                AQUA BAR
              </p>

              <h2>
                Gestione Catalogo
              </h2>

              <p className="subtitle">
                Aggiungi prodotti e modifica i prezzi di vendita
              </p>
            </div>

            <div className="user">
              <div className="avatar">
                {profile.nome
                  ?.charAt(0)
                  .toUpperCase() || "A"}
              </div>

              <div className="userInfo">
                <strong>
                  {profile.nome || "Admin"}
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
              AGGIUNGI PRODOTTO
          ================================== */}

          <div className="invoicePanel">

            <p className="welcomeLabel">
              CATALOGO
            </p>

            <h2>
              Aggiungi prodotto
            </h2>

            <form
              className="invoiceForm"
              onSubmit={addProduct}
            >
              <label>
                Nome prodotto
              </label>

              <input
                type="text"
                placeholder="Es. Cocktail Tropical"
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                required
              />

              <label>
                Prezzo di vendita ($)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Es. 150"
                value={newPrice}
                onChange={(e) =>
                  setNewPrice(e.target.value)
                }
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

          {/* MESSAGGI */}
          {message && (
            <div
              className={
                success
                  ? "invoiceMessage success"
                  : "invoiceMessage"
              }
              style={{
                marginTop: "20px",
              }}
            >
              {message}
            </div>
          )}

          {/* ==================================
              ELENCO PRODOTTI
          ================================== */}

          <div
            className="invoiceHistory"
            style={{
              marginTop: "25px",
            }}
          >
            <div className="invoiceHistoryHeader">
              <div>
                <p className="welcomeLabel">
                  AMMINISTRAZIONE
                </p>

                <h2>
                  Prodotti del catalogo
                </h2>
              </div>

              <span>
                {products.length} prodotti
              </span>
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
                      opacity:
                        product.attivo === false
                          ? 0.65
                          : 1,
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >

                    {editingId === product.id ? (
                      <>
                        {/* MODIFICA PRODOTTO */}
                        <div
                          className="invoiceForm"
                          style={{
                            flex: "1 1 250px",
                            minWidth: 0,
                          }}
                        >
                          <label>
                            Nome prodotto
                          </label>

                          <input
                            type="text"
                            value={editName}
                            onChange={(e) =>
                              setEditName(
                                e.target.value
                              )
                            }
                          />

                          <label>
                            Prezzo ($)
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) =>
                              setEditPrice(
                                e.target.value
                              )
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
                            type="button"
                            className="invoicePrimaryButton"
                            disabled={saving}
                            onClick={() =>
                              saveEdit(product)
                            }
                          >
                            SALVA
                          </button>

                          <button
                            type="button"
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
                        {/* INFORMAZIONI PRODOTTO */}
                        <div
                          className="invoiceHistoryMain"
                          style={{
                            flex: "1 1 220px",
                          }}
                        >
                          <div>
                            <strong>
                              {product.nome}
                            </strong>

                            <p>
                              {product.attivo === false
                                ? "Prodotto disattivato"
                                : "Prodotto attivo"}
                            </p>
                          </div>
                        </div>

                        {/* PREZZO */}
                        <div className="invoiceHistoryTotal">
                          <small>
                            PREZZO
                          </small>

                          <strong>
                            {product.prezzo === null
                              ? "Da impostare"
                              : `$${formatMoney(
                                  product.prezzo
                                )}`}
                          </strong>
                        </div>

                        {/* AZIONI */}
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="invoicePrimaryButton"
                            disabled={saving}
                            onClick={() =>
                              startEdit(product)
                            }
                          >
                            MODIFICA
                          </button>

                          <button
                            type="button"
                            className="cancelInvoiceButton"
                            disabled={saving}
                            onClick={() =>
                              toggleProduct(product)
                            }
                          >
                            {product.attivo === false
                              ? "RIATTIVA"
                              : "DISATTIVA"}
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
