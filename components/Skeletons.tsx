/* Grey placeholder shapes shown for the brief moment before your data appears. */

export function HomeSkeleton() {
  return (
    <div className="cards" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card skeleton-card">
          <span className="sk sk-title" />
          <span className="sk sk-line" />
          <span className="sk sk-line short" />
        </div>
      ))}
    </div>
  );
}

export function NotebookSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading notebook">
      <div className="topbar" />
      <div className="column">
        <span className="sk sk-heading" />
        <span className="sk sk-line" style={{ width: "30%" }} />
        <span className="sk sk-line" style={{ width: "45%" }} />
        <div style={{ height: 40 }} />
        {[0, 1, 2].map((i) => (
          <span key={i} className="sk sk-row" />
        ))}
      </div>
    </div>
  );
}

export function NoteSkeleton() {
  const lines = ["92%", "85%", "96%", "60%", "88%", "74%"];
  return (
    <div className="page note-page" aria-busy="true" aria-label="Loading note">
      <div className="topbar" />
      <div className="toolbar" />
      <div className="workspace">
        {[0, 1].map((side) => (
          <div key={side} className={`panel ${side ? "ai" : "mine"}`}>
            <div className="panel-inner">
              <span className="sk sk-line" style={{ width: 90 }} />
              {side === 0 && <span className="sk sk-heading" />}
              {lines.map((w, i) => (
                <span key={i} className="sk sk-line" style={{ width: w }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
