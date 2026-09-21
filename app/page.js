"use client";

export default function Home() {
  return (
    <main>
      <div className="overlay">
        <aside className="sidebar">
          <div className="brand">
            <h1>AQUA</h1>
            <span>BAR</span>
          </div>

          <nav>
            <button className="active">⌂ Dashboard</button>
            <button>▤ Fatture</button>
            <button>◈ Import</button>
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
              <h2>Dashboard</h2>
              <p className="subtitle">
                Benvenuto nel gestionale del locale
              </p>
            </div>

            <div className="user">
              <div className="avatar">A</div>
              <div>
                <strong>Dipendente</strong>
                <span>Online</span>
              </div>
            </div>
          </header>

          <div className="cards">
            <div className="card">
              <span>FONDO CASSA</span>
              <h3>$0</h3>
              <p>Conto aziendale AQUA BAR</p>
            </div>

            <div className="card">
              <span>FATTURATO PERSONALE</span>
              <h3>$0</h3>
              <p>Il tuo fatturato totale</p>
            </div>

            <div className="card">
              <span>TOTALE IMPORT</span>
              <h3>$0</h3>
              <p>Totale speso in forniture</p>
            </div>
          </div>

          <div className="welcome">
            <span className="goldLine"></span>
            <p>GESTIONALE UFFICIALE</p>
            <h2>AQUA BAR</h2>
            <p className="welcomeText">
              Gestisci fatture, vendite e forniture del locale.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
