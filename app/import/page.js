"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ImportPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [imports, setImports] = useState([]);
  const [newOrders, setNewOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedProducts = products.filter(
    (product) => Number(quantities[product.id] || 0) > 0
  );

  const totale = selectedProducts.reduce(
    (sum, product) =>
      sum +
      Number(product.prezzo) *
        Number(quantities[product.id] || 0),
    0
  );

  useEffect(() => {
    loadPage();
  }, []);

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      const [
        profileResult,
        accountResult,
        productsResult,
        importsResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("nome, ruolo")
          .eq("id", session.user.id)
          .single(),

        supabase
          .from("company_account")
          .select("saldo")
          .eq("id", 1)
          .single(),

        supabase
          .from("import_products")
          .select("id, nome, prezzo")
          .eq("attivo", true)
          .order("nome", { ascending: true }),

        supabase
          .from("imports")
          .select(
            "id, kit_cibo, kit_bevande, prezzo_kit, totale, created_at, annullato, annullato_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("import_orders")
          .select(
            "id, totale, created_at, annullato, import_order_items(nome_prodotto, quantita, prezzo_unitario)"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error) {
        console.error("Errore profilo:", profileResult.error);
      } else {
        setProfile(profileResult.data);
      }

      if (accountResult.error) {
        console.error(
          "Errore Fondo Cassa:",
          accountResult.error
        );
      } else {
        setSaldo(Number(accountResult.data?.saldo) || 0);
      }

      if (productsResult.error) {
        console.error(
          "Errore catalogo Import:",
          productsResult.error
        );
        setMessage(
          "Impossibile caricare il catalogo Import."
        );
      } else {
        setProducts(productsResult.data || []);
      }

      if (importsResult.error) {
        console.error(
          "Errore storico precedente:",
          importsResult.error
        );
      } else {
        setImports(importsResult.data || []);
      }

      if (ordersResult.error) {
        console.error(
          "Errore nuovi ordini:",
          ordersResult.error
        );
      } else {
        setNewOrders(ordersResult.data || []);
      }
    } catch (error) {
      console.error(
        "Errore caricamento Import:",
        error
      );
      setMessage(
        "Errore durante il caricamento della pagina."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    const [
      accountResult,
      importsResult,
      ordersResult,
    ] = await Promise.all([
      supabase
        .from("company_account")
        .select("saldo")
        .eq("id", 1)
        .single(),

      supabase
        .from("imports")
        .select(
          "id, kit_cibo, kit_bevande, prezzo_kit, totale, created_at, annullato, annullato_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("import_orders")
        .select(
          "id, totale, created_at, annullato, import_order_items(nome_prodotto, quantita, prezzo_unitario)"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (!accountResult.error) {
      setSaldo(
        Number(accountResult.data?.saldo) || 0
      );
    }

    if (!importsResult.error) {
      setImports(importsResult.data || []);
    }

    if (!ordersResult.error) {
      setNewOrders(ordersResult.data || []);
    }
  }

  function handleQuantityChange(productId, value) {
    setMessage("");
    setSuccess(false);

    if (value === "") {
      setQuantities((prev) => ({
        ...prev,
        [productId]: "",
      }));
      return;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) return;

    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.min(
        10000,
        Math.max(0, Math.floor(number))
      ),
    }));
  }

  async function confirmImport() {
    if (saving || cancellingId !== null) return;

    setMessage("");
    setSuccess(false);

    const cart = selectedProducts.map((product) => ({
      product_id: product.id,
      quantita: Number(quantities[product.id]),
    }));

    if (cart.length === 0) {
      setMessage("Seleziona almeno un prodotto.");
      return;
    }

    if (cart.length > 100) {
      setMessage(
        "Puoi acquistare al massimo 100 prodotti diversi."
      );
      return;
    }

    if (totale > saldo) {
      setMessage("Fondo Cassa insufficiente.");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "registra_import_dinamico",
        { p_prodotti: cart }
      );

      if (error) throw error;

      setQuantities({});

      setMessage(
        `Import registrato con successo. $${formatMoney(
          data?.totale ?? totale
        )} scalati dal Fondo Cassa.`
      );

      setSuccess(true);
      await refreshData();
    } catch (error) {
      console.error(
        "Errore registrazione Import:",
        error
      );

      const errorMessage = error?.message || "";

      setMessage(
        errorMessage
          .toLowerCase()
          .includes("fondo cassa")
          ? "Fondo Cassa insufficiente."
          : `Impossibile registrare l'import: ${errorMessage}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelImport(order) {
    if (
      order.annullato ||
      cancellingId !== null ||
      saving
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Vuoi annullare questo ordine?\n\n` +
        `Kit Cibo: ${order.kit_cibo}\n` +
        `Kit Bevande: ${order.kit_bevande}\n` +
        `Rimborso: $${formatMoney(order.totale)}\n\n` +
        `Il denaro verrà restituito al Fondo Cassa.`
    );

    if (!confirmed) return;

    setMessage("");
    setSuccess(false);
    setCancellingId(`old-${order.id}`);

    try {
      const { data, error } = await supabase.rpc(
        "annulla_import",
        { p_import_id: order.id }
      );

      if (error) throw error;

      setMessage(
        `Ordine annullato. $${formatMoney(
          data?.rimborso
        )} restituiti al Fondo Cassa.`
      );

      setSuccess(true);
      await refreshData();
    } catch (error) {
      console.error(
        "Errore annullamento vecchio Import:",
        error
      );

      setMessage(
        "Non è stato possibile annullare l'ordine."
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function cancelNewImport(order) {
    if (
      order.annullato ||
      cancellingId !== null ||
      saving ||
      profile?.ruolo !== "admin"
    ) {
      return;
    }

    const details = order.descrizione.join("\n");

    const confirmed = window.confirm(
      `Vuoi annullare questo ordine?\n\n` +
        `${details}\n\n` +
        `Rimborso: $${formatMoney(order.totale)}\n\n` +
        `Il denaro verrà restituito al Fondo Cassa.`
    );

    if (!confirmed) return;

    setMessage("");
    setSuccess(false);
    setCancellingId(`new-${order.id}`);

    try {
      const { data, error } = await supabase.rpc(
        "annulla_import_dinamico",
        { p_order_id: order.id }
      );

      if (error) throw error;

      setMessage(
        `Ordine annullato. $${formatMoney(
          data?.rimborso
        )} restituiti al Fondo Cassa.`
      );

      setSuccess(true);
      await refreshData();
    } catch (error) {
      console.error(
        "Errore annullamento nuovo Import:",
        error
      );

      setMessage(
        `Non è stato possibile annullare l'ordine: ${
          error?.message || "Errore sconosciuto"
        }`
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const history = [
    ...imports.map((order) => ({
      ...order,
      tipo: "vecchio",
      key: `old-${order.id}`,
      descrizione: [
        `Kit Cibo: ${order.kit_cibo}`,
        `Kit Bevande: ${order.kit_bevande}`,
      ],
    })),

    ...newOrders.map((order) => ({
      ...order,
      tipo: "nuovo",
      key: `new-${order.id}`,
      descrizione: (
        order.import_order_items || []
      ).map(
        (item) =>
          `${item.nome_prodotto}: ${item.quantita}`
      ),
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

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
              onClick={() => router.push("/")}
            >
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

            {profile?.ruolo === "admin" && (
              <>
                <button
                  onClick={() =>
                    router.push("/stipendi")
                  }
                >
                  <span className="navIcon">♙</span>
                  Stipendi
                </button>

                <button
                  onClick={() =>
                    router.push("/dipendenti")
                  }
                >
                  <span className="navIcon">♟</span>
                  Dipendenti
                </button>

                <button
                  onClick={() =>
                    router.push("/admin/import")
                  }
                >
                  <span className="navIcon">▦</span>
                  Catalogo Import
                </button>
              </>
            )}
          </nav>

          <div className="sidebarBottom">
            <p>Gestionale AQUA BAR</p>
            <small>FiveM Management</small>
          </div>
        </aside>

        {/* CONTENUTO */}

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

          {/* FONDO CASSA */}

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
              Gli import vengono pagati
              utilizzando il conto aziendale
              AQUA BAR.
            </p>
          </div>

          {/* CATALOGO PRODOTTI */}

          <div className="importGrid">
            {products.length === 0 ? (
              <div className="importKitCard">
                <p className="emptyCart">
                  Nessun prodotto disponibile
                  nel catalogo Import.
                </p>
              </div>
            ) : (
              products.map((product) => {
                const quantity = Number(
                  quantities[product.id] || 0
                );

                return (
                  <div
                    className="importKitCard"
                    key={product.id}
                  >
                    <div className="importKitIcon">
                      📦
                    </div>

                    <p className="welcomeLabel">
                      FORNITURE
                    </p>

                    <h2>
                      {product.nome}
                    </h2>

                    <p className="importPrice">
                      ${formatMoney(product.prezzo)}
                      <span> / unità</span>
                    </p>

                    <label className="quantityLabel">
                      QUANTITÀ
                    </label>

                    <input
                      className="quantityInput"
                      type="number"
                      min="0"
                      max="10000"
                      step="1"
                      value={
                        quantities[product.id] ?? 0
                      }
                      onChange={(e) =>
                        handleQuantityChange(
                          product.id,
                          e.target.value
                        )
                      }
                      onFocus={(e) =>
                        e.target.select()
                      }
                    />

                    <div className="kitSubtotal">
                      <span>Subtotale</span>

                      <strong>
                        $
                        {formatMoney(
                          quantity *
                            Number(product.prezzo)
                        )}
                      </strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIEPILOGO */}

          <div className="importSummary">
            <div>
              <p className="welcomeLabel">
                RIEPILOGO IMPORT
              </p>

              {selectedProducts.length === 0 ? (
                <p className="emptyCart">
                  Nessun prodotto selezionato.
                </p>
              ) : (
                selectedProducts.map((product) => (
                  <div
                    className="importSummaryRow"
                    key={product.id}
                  >
                    <span>
                      {product.nome}
                    </span>

                    <strong>
                      {Number(
                        quantities[product.id]
                      )}
                    </strong>
                  </div>
                ))
              )}

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
                  cancellingId !== null ||
                  selectedProducts.length === 0
                }
              >
                {saving
                  ? "REGISTRAZIONE..."
                  : "CONFERMA IMPORT"}
              </button>
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

          {/* STORICO IMPORT */}

          <div className="importHistory">
            <div className="importHistoryHeader">
              <div>
                <p className="welcomeLabel">
                  MOVIMENTI
                </p>

                <h2>
                  Storico Import
                </h2>
              </div>

              <span>
                {history.length} ordini
              </span>
            </div>

            {history.length === 0 ? (
              <p className="emptyCart">
                Nessun import registrato.
              </p>
            ) : (
              <div className="importHistoryList">
                {history.map((order) => (
                  <div
                    className={`importHistoryItem ${
                      order.annullato
                        ? "cancelled"
                        : ""
                    }`}
                    key={order.key}
                  >
                    <div className="importHistoryMain">
                      <div className="importOrderNumber">
                        #{order.id}
                      </div>

                      <div>
                        <strong>
                          Import AQUA BAR
                        </strong>

                        <p>
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="importHistoryDetails">
                      {order.descrizione.map(
                        (detail, index) => (
                          <span key={index}>
                            {detail}
                          </span>
                        )
                      )}
                    </div>

                    <div className="importHistoryTotal">
                      <small>
                        Totale
                      </small>

                      <strong>
                        $
                        {formatMoney(
                          order.totale
                        )}
                      </strong>
                    </div>

                    <div className="importHistoryAction">
                      {order.annullato ? (
                        <span className="cancelledBadge">
                          ANNULLATO
                        </span>
                      ) : order.tipo === "vecchio" ? (
                        <button
                          className="cancelImportButton"
                          onClick={() =>
                            cancelImport(order)
                          }
                          disabled={
                            cancellingId !== null ||
                            saving
                          }
                        >
                          {cancellingId === order.key
                            ? "ANNULLAMENTO..."
                            : "ANNULLA ORDINE"}
                        </button>
                      ) : profile?.ruolo === "admin" ? (
                        <button
                          className="cancelImportButton"
                          onClick={() =>
                            cancelNewImport(order)
                          }
                          disabled={
                            cancellingId !== null ||
                            saving
                          }
                        >
                          {cancellingId === order.key
                            ? "ANNULLAMENTO..."
                            : "ANNULLA ORDINE"}
                        </button>
                      ) : (
                        <span>
                          Ordine registrato
                        </span>
                      )}
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
