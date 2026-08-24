"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        readonly sitekey: string;
        readonly callback: (token: string) => void;
        readonly "expired-callback": () => void;
        readonly "error-callback": () => void;
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  readonly onToken: (token: string) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) return;

    const render = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
      setIsConfigured(true);
    };

    if (window.turnstile) {
      render();
      return () => {
        if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
    const script = existingScript ?? document.createElement("script");
    if (!existingScript) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => script.removeEventListener("load", render);
  }, [onToken]);

  return <div ref={containerRef} aria-live="polite">{!isConfigured && <small className="turnstile-note">Security verification is required before submitting.</small>}</div>;
}

