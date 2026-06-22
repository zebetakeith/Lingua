import { lazy, Suspense, useEffect } from "react";


const CastleBattleLab = lazy(() => import("./experiments/CastleBattleLab"));
const LegacyApp = lazy(() => import("./App"));

function LoadingScreen({ gooKeep }: { gooKeep: boolean }) {
  return (
    <main className={`flex min-h-screen items-center justify-center ${gooKeep ? "bg-[#fff9dd] text-[#225d62]" : "bg-[#07101f] text-white"}`}>
      <div className="grid justify-items-center gap-3 rounded-3xl bg-white/10 px-8 py-7 text-center shadow-lg" role="status" aria-live="polite">
        <span className="animate-pulse text-4xl text-[#d4a92e] motion-reduce:animate-none" aria-hidden="true">✦</span>
        <b>{gooKeep ? "Opening Pipplo's Goo Keep…" : "Opening Lexicon Labyrinth…"}</b>
        <span className="text-xs opacity-75">{gooKeep ? "Waking the nursery and Mallow's moon gate" : "Preparing your study world"}</span>
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
