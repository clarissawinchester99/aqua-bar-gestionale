
"use client";

import { usePathname, useRouter } from "next/navigation";

export default function Sidebar({ profile }) {
  const router = useRouter();
  const pathname = usePathname();

  const admin = profile?.ruolo === "admin";

  function voce(testo, icona, percorso) {
    const attiva = pathname === percorso;

    return (
      <button
        type="button"
        className={attiva ? "active" : ""}
        onClick={() => router.push(percorso)}
      >
        <span className="navIcon">{icona}</span>
        {testo}
      </button>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>AQUA</h1>
        <span>BAR</span>
      </div>

      <nav>
        {/* MENU GENERALE */}

        {voce("Dashboard", "⌂", "/")}

        {voce("Fatture", "▤", "/fatture")}

        {voce("Import", "◇", "/import")}

        {voce(
          "Il mio stipendio",
          "♙",
          "/mio-stipendio"
        )}

        {/* AREA AMMINISTRATORE */}

        {admin && (
          <>
            <div
              style={{
                marginTop: "26px",
                marginBottom: "12px",
                padding: "16px 12px 8px",
                borderTop:
                  "1px solid rgba(212,175,55,0.3)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#d4af37",
                  fontSize: "11px",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                }}
              >
                ♛ AREA AMMINISTRATORE
              </span>
            </div>

            {voce(
              "Gestione Dipendenti",
              "♟",
              "/dipendenti"
            )}

            {voce(
              "Gestione Catalogo",
              "▦",
              "/admin/catalogo"
            )}

            {voce(
              "Gestione Import",
              "▱",
              "/admin/import"
            )}

            {voce(
              "Gestione Stipendi",
              "♙",
              "/stipendi"
            )}
          </>
        )}
      </nav>

      <div className="sidebarBottom">
        <p>Gestionale AQUA BAR</p>
        <small>FiveM Management</small>
      </div>
    </aside>
  );
}
