"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function FatturePage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Ogni elemento del carrello rappresenta una fattura separata
  const [cart, setCart] = useState([]);

  const [cartOpen, setCartOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("nome, ruolo")
        .eq("id", currentUser.id)
        .single();

    if (profileError) {
      console.error("Errore profilo:", profileError);
    } else {
      setProfile(profileData);
    }

    const { data: productData, error: productError } =
      await supabase
        .from("products")
        .select("id, nome, prezzo")
        .eq("attivo", true)
        .order("id");

    if (productError) {
      console.error("Errore prodotti:", productError);
      setMessage("Errore durante il caricamento dei prodotti.");
    } else {
      setProducts(productData || []);

      if (productData?.length) {
        setSelectedProduct(String(productData[0].id));
      }
    }

    setLoading(false);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function addToCart() {
    setMessage("");

    const product = products.find(
      (item) =>
        String(item.id) === String(selectedProduct)
    );

    if (!product) {
      setMessage("Seleziona un prodotto.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      setMessage("Inserisci una quantità valida.");
      return;
    }

    if (
      product.prezzo === null ||
      product.prezzo === undefined
    ) {
      setMessage(
        `Il prezzo di "${product.nome}" non è ancora stato impostato.`
      );
      return;
    }

    const prezzo = Number(product.prezzo);

    // ID locale unico per distinguere anche due fatture identiche
    const localId =
      Date.now().toString() +
      Math.random().toString(36).slice(2);

    const nuovaFattura = {
      localId,
      product_id: product.id,
      nome: product.nome,
      quantita: qty,
      prezzo_unitario: prezzo,
      totale: qty * prezzo,
    };

    // IMPORTANTE:
    // aggiungiamo sempre una nuova fattura.
    // Non sommiamo mai con quelle già presenti.
    setCart((current) => [
      ...current,
      nuovaFattura,
    ]);

    setQuantity(1);
    setCartOpen(true);
  }

  function removeFromCart(localId) {
    setCart((current) =>
      current.filter(
        (invoice) => invoice.localId !== localId
      )
    );
  }

  const grandTotal = useMemo(() => {
    return cart.reduce(
      (sum, invoice) =>
        sum + Number(invoice.totale || 0),
      0
    );
  }, [cart]);

  async function confirmInvoices() {
    if (!user || cart.length === 0 || saving) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Ogni anteprima del carrello diventa
      // una fattura SEPARATA nel database.
      for (const invoice of cart) {
        const {
          data: createdInvoice,
          error: invoiceError,
        } = await supabase
          .from("invoices")
          .insert({
            employee_id: user.id,
            totale: invoice.totale,
          })
          .select("id")
          .single();

        if (invoiceError) {
          throw invoiceError;
        }

        const { error: itemError } = await supabase
          .from("invoice_items")
          .insert({
            invoice_id: createdInvoice.id,
            product_id: invoice.product_id,
            quantita: invoice.quantita,
            prezzo_unitario:
              invoice.prezzo_unitario,
            subtotale: invoice.totale,
          });

        if (itemError) {
          throw itemError;
        }
      }

      const numeroFatture = cart.length;

      setCart([]);

      setMessage(
        numeroFatture === 1
          ? "Fattura registrata con successo!"
          : `${numeroFatture} fatture registrate con successo!`
      );
    } catch (error) {
      console.error(
        "Errore registrazione fatture:",
        error
      );

      setMessage(
        "Si è verificato un errore durante la registrazione delle fatture."
      );
    }

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

            <button className="active">
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

              <h2>Fatture</h2>

              <p className="subtitle">
                Registra le tue vendite
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

          <div className="invoiceLayout">

            {/* NUOVA FATTURA */}

            <div className="invoicePanel">

              <p className="welcomeLabel">
                NUOVA FATTURA
              </p>

              <h2>Aggiungi fattura</h2>

              <div className="invoiceForm">

                <label>Prodotto</label>

                <select
                  value={selectedProduct}
                  onChange={(e) =>
                    setSelectedProduct(
                      e.target.value
                    )
                  }
                >
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.nome}
                      {product.prezzo !== null
                        ? ` — $${formatMoney(
                            product.prezzo
                          )}`
                        : " — prezzo da impostare"}
                    </option>
                  ))}
                </select>

                <label>Quantità</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  onFocus={(e) =>
                    e.target.select()
                  }
                />

                <button
                  className="invoicePrimaryButton"
                  onClick={addToCart}
                >
                  + AGGIUNGI AL CARRELLO
                </button>

              </div>

            </div>

            {/* CARRELLO */}

            <div className="cartPanel">

              <button
                className="cartHeader"
                onClick={() =>
                  setCartOpen(!cartOpen)
                }
              >
                <span>
                  CARRELLO — {cart.length}{" "}
                  {cart.length === 1
                    ? "FATTURA"
                    : "FATTURE"}
                </span>

                <strong>
                  {cartOpen ? "▲" : "▼"}
                </strong>
              </button>

              {cartOpen && (
                <div className="cartContent">

                  {cart.length === 0 ? (

                    <p className="emptyCart">
                      Nessuna fattura nel carrello.
                    </p>

                  ) : (

                    <>
                      {cart.map(
                        (invoice, index) => (

                          <div
                            className="cartItem"
                            key={
                              invoice.localId
                            }
                          >

                            <div>

                              <span>
                                FATTURA #
                                {index + 1}
                              </span>

                              <strong>
                                {invoice.nome}
                              </strong>

                              <span>
                                Quantità:{" "}
                                {invoice.quantita}
                              </span>

                              <span>
                                $
                                {formatMoney(
                                  invoice.prezzo_unitario
                                )}{" "}
                                ×{" "}
                                {invoice.quantita}
                              </span>

                            </div>

                            <div className="cartItemRight">

                              <strong>
                                $
                                {formatMoney(
                                  invoice.totale
                                )}
                              </strong>

                              <button
                                onClick={() =>
                                  removeFromCart(
                                    invoice.localId
                                  )
                                }
                                title="Rimuovi fattura"
                              >
                                ×
                              </button>

                            </div>

                          </div>

                        )
                      )}

                      <div className="cartTotal">

                        <div>
                          <span>
                            TOTALE CARRELLO
                          </span>

                          <small
                            style={{
                              display: "block",
                              marginTop: "5px",
                              color:
                                "rgba(255,255,255,.45)",
                            }}
                          >
                            {cart.length}{" "}
                            {cart.length === 1
                              ? "fattura"
                              : "fatture"}
                          </small>
                        </div>

                        <strong>
                          $
                          {formatMoney(
                            grandTotal
                          )}
                        </strong>

                      </div>

                      <button
                        className="invoiceConfirmButton"
                        onClick={
                          confirmInvoices
                        }
                        disabled={saving}
                      >
                        {saving
                          ? "REGISTRAZIONE..."
                          : cart.length === 1
                          ? "CONFERMA FATTURA"
                          : `CONFERMA ${cart.length} FATTURE`}
                      </button>

                    </>

                  )}

                </div>
              )}

            </div>

          </div>

          {message && (
            <div
              className={
                message.includes(
                  "successo"
                )
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
