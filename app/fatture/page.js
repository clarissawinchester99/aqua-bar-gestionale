"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function FatturePage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);

  const [cartOpen, setCartOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function getHistory(currentUser, currentProfile) {
    let query = supabase
      .from("invoices")
      .select(`
        id,
        employee_id,
        totale,
        created_at,
        annullato,
        annullato_at,
        invoice_items (
          id,
          quantita,
          prezzo_unitario,
          subtotale,
          products (
            nome
          )
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (currentProfile?.ruolo !== "admin") {
      query = query.eq(
        "employee_id",
        currentUser.id
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const invoices = data || [];

    if (invoices.length === 0) {
      return [];
    }

    /*
      Recuperiamo i nomi dei dipendenti
      collegati alle fatture.
    */

    const employeeIds = [
      ...new Set(
        invoices
          .map((invoice) => invoice.employee_id)
          .filter(Boolean)
      ),
    ];

    const {
      data: employees,
      error: employeesError,
    } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", employeeIds);

    if (employeesError) {
      console.error(
        "Errore caricamento nomi dipendenti:",
        employeesError
      );
    }

    const employeeMap = {};

    (employees || []).forEach((employee) => {
      employeeMap[employee.id] = employee.nome;
    });

    return invoices.map((invoice) => ({
      ...invoice,
      employee_name:
        employeeMap[invoice.employee_id] ||
        "Dipendente",
    }));
  }

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

      const currentUser = session.user;

      setUser(currentUser);

      /*
        Prima carichiamo il profilo,
        perché dobbiamo sapere se
        l'utente è admin.
      */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("nome, ruolo")
        .eq("id", currentUser.id)
        .single();

      if (profileError) {
        console.error(
          "Errore profilo:",
          profileError
        );
      } else {
        setProfile(profileData);
      }

      /*
        Prodotti
      */

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("products")
        .select("id, nome, prezzo")
        .eq("attivo", true)
        .order("id");

      if (productError) {
        console.error(
          "Errore prodotti:",
          productError
        );
      } else {
        const prodotti = productData || [];

        setProducts(prodotti);

        if (prodotti.length) {
          setSelectedProduct(
            String(prodotti[0].id)
          );
        }
      }

      /*
        Storico:
        ADMIN = tutte
        DIPENDENTE = solo proprie
      */

      try {
        const historyData = await getHistory(
          currentUser,
          profileData
        );

        setHistory(historyData);
      } catch (historyError) {
        console.error(
          "Errore storico fatture:",
          historyError
        );
      }
    } catch (error) {
      console.error(
        "Errore caricamento Fatture:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!user || !profile) return;

    try {
      const historyData = await getHistory(
        user,
        profile
      );

      setHistory(historyData);
    } catch (error) {
      console.error(
        "Errore storico fatture:",
        error
      );
    }
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

  function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function addToCart() {
    setMessage("");
    setSuccess(false);

    const product = products.find(
      (item) =>
        String(item.id) ===
        String(selectedProduct)
    );

    if (!product) {
      setMessage("Seleziona un prodotto.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      setMessage(
        "Inserisci una quantità valida."
      );
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

    const nuovaFattura = {
      localId:
        Date.now().toString() +
        Math.random().toString(36).slice(2),

      product_id: product.id,
      nome: product.nome,
      quantita: qty,
      prezzo_unitario: prezzo,
      totale: qty * prezzo,
    };

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
        (invoice) =>
          invoice.localId !== localId
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
    if (
      !user ||
      cart.length === 0 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setSuccess(false);

    try {
      for (const invoice of cart) {
        const { error } =
          await supabase.rpc(
            "registra_fattura",
            {
              p_product_id:
                invoice.product_id,

              p_quantita:
                invoice.quantita,

              p_prezzo_unitario:
                invoice.prezzo_unitario,
            }
          );

        if (error) {
          throw error;
        }
      }

      const numeroFatture = cart.length;

      setCart([]);

      setMessage(
        numeroFatture === 1
          ? "Fattura registrata con successo! Il Fondo Cassa è stato aggiornato."
          : `${numeroFatture} fatture registrate con successo! Il Fondo Cassa è stato aggiornato.`
      );

      setSuccess(true);

      await loadHistory();
    } catch (error) {
      console.error(
        "Errore registrazione fatture:",
        error
      );

      setMessage(
        "Si è verificato un errore durante la registrazione delle fatture."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelInvoice(invoice) {
    if (
      invoice.annullato ||
      cancellingId
    ) {
      return;
    }

    const item =
      invoice.invoice_items?.[0];

    const prodotto =
      item?.products?.nome ||
      "Prodotto";

    const quantita =
      item?.quantita || 0;

    const dipendente =
      invoice.employee_name ||
      "Dipendente";

    const confirmed =
      window.confirm(
        `Vuoi annullare questa fattura?\n\n` +
          `Fattura: #${invoice.id}\n` +
          `Dipendente: ${dipendente}\n` +
          `Prodotto: ${prodotto}\n` +
          `Quantità: ${quantita}\n` +
          `Totale: $${formatMoney(
            invoice.totale
          )}\n\n` +
          `La fattura verrà esclusa dal fatturato e il totale verrà sottratto dal Fondo Cassa.`
      );

    if (!confirmed) return;

    setCancellingId(invoice.id);
    setMessage("");
    setSuccess(false);

    const { data, error } =
      await supabase.rpc(
        "annulla_fattura",
        {
          p_invoice_id:
            invoice.id,
        }
      );

    if (error) {
      console.error(
        "Errore annullamento fattura:",
        error
      );

      setMessage(
        "Non è stato possibile annullare la fattura."
      );

      setCancellingId(null);
      return;
    }

    setMessage(
      `Fattura #${invoice.id} annullata. $${formatMoney(
        data?.totale_annullato
      )} sottratti dal Fondo Cassa e dal fatturato.`
    );

    setSuccess(true);

    await loadHistory();

    setCancellingId(null);
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

            <button className="active">
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

            {profile?.ruolo === "admin" && (
              <>

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

              </>
            )}

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

          {/* HEADER */}

          <header>

            <div>

              <p className="eyebrow">
                AQUA BAR
              </p>

              <h2>
                Fatture
              </h2>

              <p className="subtitle">
                {profile?.ruolo === "admin"
                  ? "Registra vendite e controlla le fatture di tutto il personale"
                  : "Registra le tue vendite"}
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
                    "Utente"}
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

          {/* NUOVA FATTURA */}

          <div className="invoiceLayout">

            <div className="invoicePanel">

              <p className="welcomeLabel">
                NUOVA FATTURA
              </p>

              <h2>
                Aggiungi fattura
              </h2>

              <div className="invoiceForm">

                <label>
                  Prodotto
                </label>

                <select
                  value={selectedProduct}
                  onChange={(e) =>
                    setSelectedProduct(
                      e.target.value
                    )
                  }
                >

                  {products.map(
                    (product) => (

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

                    )
                  )}

                </select>

                <label>
                  Quantità
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value
                    )
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
                  CARRELLO —{" "}
                  {cart.length}{" "}
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
                            key={invoice.localId}
                          >

                            <div>

                              <span>
                                FATTURA #{index + 1}
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

                        <span>
                          TOTALE CARRELLO
                        </span>

                        <strong>
                          $
                          {formatMoney(
                            grandTotal
                          )}
                        </strong>

                      </div>

                      <button
                        className="invoiceConfirmButton"
                        onClick={confirmInvoices}
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

          {/* MESSAGGI */}

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

          {/* STORICO FATTURE */}

          <div className="invoiceHistory">

            <div className="invoiceHistoryHeader">

              <div>

                <p className="welcomeLabel">
                  MOVIMENTI
                </p>

                <h2>
                  {profile?.ruolo === "admin"
                    ? "Storico Fatture — Tutti i Dipendenti"
                    : "Storico Fatture"}
                </h2>

              </div>

              <span>
                {history.length}{" "}
                fatture
              </span>

            </div>

            {history.length === 0 ? (

              <p className="emptyCart">
                Nessuna fattura registrata.
              </p>

            ) : (

              <div className="invoiceHistoryList">

                {history.map((invoice) => {

                  const item =
                    invoice.invoice_items?.[0];

                  return (

                    <div
                      className={`invoiceHistoryItem ${
                        invoice.annullato
                          ? "cancelled"
                          : ""
                      }`}
                      key={invoice.id}
                    >

                      {/* NUMERO + PRODOTTO */}

                      <div className="invoiceHistoryMain">

                        <div className="invoiceNumber">
                          #{invoice.id}
                        </div>

                        <div>

                          <strong>
                            {item
                              ?.products
                              ?.nome ||
                              "Fattura AQUA BAR"}
                          </strong>

                          {/* NOME DIPENDENTE */}

                          {profile?.ruolo ===
                            "admin" && (

                            <p
                              style={{
                                color: "#d4af37",
                                fontWeight: "700",
                                marginTop: "4px",
                                marginBottom: "2px",
                              }}
                            >
                              👤{" "}
                              {invoice.employee_name}
                            </p>

                          )}

                          <p>
                            {formatDate(
                              invoice.created_at
                            )}
                          </p>

                        </div>

                      </div>

                      {/* QUANTITÀ + PREZZO */}

                      <div className="invoiceHistoryDetails">

                        <span>

                          QUANTITÀ

                          <strong>
                            {item?.quantita || 0}
                          </strong>

                        </span>

                        <span>

                          PREZZO

                          <strong>
                            $
                            {formatMoney(
                              item?.prezzo_unitario
                            )}
                          </strong>

                        </span>

                      </div>

                      {/* TOTALE */}

                      <div className="invoiceHistoryTotal">

                        <small>
                          TOTALE
                        </small>

                        <strong>
                          $
                          {formatMoney(
                            invoice.totale
                          )}
                        </strong>

                      </div>

                      {/* AZIONE */}

                      <div className="invoiceHistoryAction">

                        {invoice.annullato ? (

                          <span className="cancelledBadge">
                            ANNULLATA
                          </span>

                        ) : (

                          <button
                            className="cancelInvoiceButton"
                            onClick={() =>
                              cancelInvoice(
                                invoice
                              )
                            }
                            disabled={
                              cancellingId ===
                              invoice.id
                            }
                          >

                            {cancellingId ===
                            invoice.id
                              ? "ANNULLAMENTO..."
                              : "ANNULLA FATTURA"}

                          </button>

                        )}

                      </div>

                    </div>

                  );
                })}

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}
