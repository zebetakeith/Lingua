import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from "react";
import "./GooKeepRouter.css";


const CastleBattleLab = lazy(() => import("./experiments/CastleBattleLab"));
const LegacyApp = lazy(() => import("./App"));

function LoadingScreen({ gooKeep }: { gooKeep: boolean }) {
  return (
    <main className={`goo-route-loading ${gooKeep ? "is-goo-keep" : ""}`}>
      <div className="goo-route-loading-card" role="status" aria-live="polite">
        <span className="goo-route-loading-spark" aria-hidden="true">✦</span>
        <b>{gooKeep ? "Opening Pipplo's Goo Keep…" : "Opening Lexicon Labyrinth…"}</b>
        <small>{gooKeep ? "Waking the nursery and Mallow's moon gate" : "Preparing your study world"}</small>
      </div>
    </main>
  );
}

class RouteErrorBoundary extends Component<{ gooKeep: boolean; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Game route recovery", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={`goo-route-loading goo-route-recovery ${this.props.gooKeep ? "is-goo-keep" : ""}`}>
        <section className="goo-route-loading-card" role="alert">
          <span className="goo-route-loading-spark" aria-hidden="true">✦</span>
          <b>{this.props.gooKeep ? "The moon gate wobbled shut" : "The study world needs another try"}</b>
          <small>Anything saved before this wobble is still safe.</small>
          <div>
            <button onClick={() => window.location.reload()}>Try again</button>
            {this.props.gooKeep && <button className="is-quiet" onClick={() => { window.location.href = window.location.pathname; }}>Main menu</button>}
          </div>
        </section>
      </main>
    );
  }
}

export default function GooKeepRouter() {
  const labId = new URLSearchParams(window.location.search).get("lab");
  const gooKeep = labId === "goo-keep" || labId === "blob-tactics";

  useEffect(() => {
    document.title = gooKeep ? "Pipplo's Goo Keep" : "Lexicon Labyrinth";
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = gooKeep ? "#a5dfdf" : "#050816";
  }, [gooKeep]);

  return (
    <RouteErrorBoundary gooKeep={gooKeep}>
      <Suspense fallback={<LoadingScreen gooKeep={gooKeep} />}>
        {gooKeep
          ? <CastleBattleLab onExit={() => { window.location.href = window.location.pathname; }} />
          : <LegacyApp />}
      </Suspense>
    </RouteErrorBoundary>
  );
}
