"use client";

import { useEffect, useState } from "react";
import { WindowsIcon } from "./OsIcons";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type State = "checking" | "ready" | "installed" | "manual";

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** The browser's own install prompt when it offers one; otherwise the steps to install from the browser menu. */
export default function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (isStandalone()) {
      const done = window.setTimeout(() => setState("installed"), 0);
      return () => window.clearTimeout(done);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setState("ready");
    };
    const onInstalled = () => {
      setPrompt(null);
      setState("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const fallback = window.setTimeout(() => setState((s) => (s === "checking" ? "manual" : s)), 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(fallback);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    setState(choice.outcome === "accepted" ? "installed" : "manual");
  }

  if (state === "installed") {
    return (
      <p role="status" className="text-[15px] text-[var(--text-secondary)]">
        Fydell is installed. Open it from the Start menu, taskbar or your apps.
      </p>
    );
  }

  if (state === "manual") {
    return (
      <div className="flex flex-col items-center gap-3">
        <a href="#install" className="l-btn l-btn-lg l-btn-solid">
          <WindowsIcon size={16} />
          How to install
        </a>
        <p className="max-w-[46ch] text-center text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          In Microsoft Edge or Google Chrome, select the install icon at the right end of the address bar, or open the browser menu and choose Install Fydell. In Safari on a Mac, choose File, then Add to Dock.
        </p>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void install()} disabled={state !== "ready"} className="l-btn l-btn-lg l-btn-solid disabled:cursor-wait disabled:opacity-60">
      <WindowsIcon size={16} />
      Install Fydell
    </button>
  );
}
