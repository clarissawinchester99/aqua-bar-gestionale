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
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("nome, ruolo")
      .eq("id", currentUser.id)
      .single();

    if (profileError) {
      console.error(profileError);
    } else {
      setProfile(profileData);
    }

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, nome, prezzo")
      .eq("attivo", true)
      .order("id");

    if (productError) {
      console.error(productError);
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
      (item) => String(item.id) === String(selectedProduct)
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

    if (product.prezzo === null || product.prezzo === undefined) {
      setMessage(
        `Il prezzo di "${product.nome}" non è ancora stato impostato.`
      );
      return;
    }

    const existing = cart.find(
      (item) => item.product_id === product.id
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantita: item.quantita + qty,
                subtotale:
                  (item.quantita + qty) *
                  Number(item.prezzo_unitario),
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          nome: product.nome,
          quantita: qty,
          prezzo_unitario: Number(product.prezzo),
          subtotale: qty * Number(product.prezzo),
        },
      ]);
    }

    setQuantity(1);
    setCartOpen(true);
  }

  function removeFromCart(productId) {
    setCart(
      cart.filter((item) => item.product_id !== productId)
    );
  }

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.subtotale),
      0
    );
  }, [cart]);

  async function confirmInvoice() {
    if (!user || cart.length === 0 || saving) return;

    setSaving(true);
    setMessage("");

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        employee_id: user.id,
        totale: total,
      })
      .select("id")
      .single();

    if (invoiceError) {
      console.error(invoiceError);
      setMessage("Errore durante la creazione della fattura.");
      setSaving(false);
      return;
    }

    const items = cart.map((item) => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      quantita: item.quantita,
      prezzo_unitario: item.prezzo_unitario,
      subtotale: item.subtotale,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(items);

    if (itemsError) {
      console.error(itemsError);

      setMessage(
        "La fattura è stata creata, ma si è verificato un errore con i prodotti."
      );

      setSaving(false);
      return;
    }

    setCart([]);
    setMessage("Fattura registrata con successo!");
    setSaving(false);
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

            <button className="active">
              <span className="navIcon">▤</span>
              Fatture
            </button>

            <button onClick={() => router.push("/import")}>
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
              <h2>Fatture</h2>

              <p className="subtitle">
                Registra le tue vendite
              </p>
            </div>

            <div className="user">

              <div className="avatar">
                {profile?.nome?.charAt(0).toUpperCase() || "A"}
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

            <div className="invoicePanel">

              <p className="welcomeLabel">
                NUOVA FATTURA
              </p>

              <h2>Aggiungi prodotto</h2>

              <div className="invoiceForm">

                <label>Prodotto</label>

                <select
                  value={selectedProduct}
                  onChange={(e) =>
                    setSelectedProduct(e.target.value)
                  }
                >
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.nome}
                      {product.prezzo !== null
                        ? ` — $${formatMoney(product.prezzo)}`
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
                />

                <button
                  className="invoicePrimaryButton"
                  onClick={addToCart}
                >
                  + Aggiungi al carrello
                </button>

              </div>

            </div>

            <div className="cartPanel">

              <button
                className="cartHeader"
                onClick={() => setCartOpen(!cartOpen)}
              >
                <span>
                  CARRELLO ({cart.length})
                </span>

                <strong>
                  {cartOpen ? "▲" : "▼"}
                </strong>
              </button>

              {cartOpen && (
                <div className="cartContent">

                  {cart.length === 0 ? (
                    <p className="emptyCart">
                      Il carrello è vuoto.
                    </p>
                  ) : (
                    <>
                      {cart.map((item) => (
                        <div
                          className="cartItem"
                          key={item.product_id}
                        >

                          <div>
                            <strong>
                              {item.nome}
                            </strong>

                            <span>
                              {item.quantita} × $
                              {formatMoney(
                                item.prezzo_unitario
                              )}
                            </span>
                          </div>

                          <div className="cartItemRight">

                            <strong>
                              $
                              {formatMoney(
                                item.subtotale
                              )}
                            </strong>

                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.product_id
                                )
                              }
                            >
                              ×
                            </button>

                          </div>

                        </div>
                      ))}

                      <div className="cartTotal">

                        <span>TOTALE</span>

                        <strong>
                          ${formatMoney(total)}
                        </strong>

                      </div>

                      <button
                        className="invoiceConfirmButton"
                        onClick={confirmInvoice}
                        disabled={saving}
                      >
                        {saving
                          ? "REGISTRAZIONE..."
                          : "CONFERMA FATTURA"}
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
                message.includes("successo")
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
