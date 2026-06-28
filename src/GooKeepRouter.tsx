import { lazy, Suspense, useEffect } from "react";
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

export default function GooKeepRouter() {
  const labId = new URLSearchParams(window.location.search).get("lab");
  const gooKeep = labId === "goo-keep" || labId === "blob-tactics";

  useEffect(() => {
    document.title = gooKeep ? "Pipplo's Goo Keep" : "Lexicon Labyrinth";
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = gooKeep ? "#a5dfdf" : "#050816";
  }, [gooKeep]);

  return (
    <Suspense fallback={<LoadingScreen gooKeep={gooKeep} />}>
      {gooKeep
        ? <CastleBattleLab onExit={() => { window.location.href = window.location.pathname; }} />
        : <LegacyApp />}
    </Suspense>
  );
}
