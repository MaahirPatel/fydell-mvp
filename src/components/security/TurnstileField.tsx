"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "dark" | "light" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile field. Renders nothing when site key is unset (local/dev).
 */
export default function TurnstileField({
  onToken,
}: {
  onToken?: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetId = useId();

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let renderedId: string | undefined;

    function mount() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      renderedId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        theme: "dark",
        callback: (token: string) => {
          if (inputRef.current) inputRef.current.value = token;
          onToken?.(token);
        },
        "expired-callback": () => {
          if (inputRef.current) inputRef.current.value = "";
          onToken?.("");
        },
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing && window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener("load", mount);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => mount();
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (renderedId && window.turnstile) {
        try {
          window.turnstile.reset(renderedId);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, onToken, widgetId]);

  if (!siteKey) return null;

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      <input ref={inputRef} type="hidden" name="captchaToken" defaultValue="" />
    </div>
  );
}
