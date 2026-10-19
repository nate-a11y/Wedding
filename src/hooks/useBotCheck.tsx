'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useBotCheck(action: string) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [error, setError] = useState('');

  const fail = useCallback(() => {
    const message = 'Bot verification could not finish. Please try again or reload the page.';
    setError(message);
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current.reject(new Error(message));
      pending.current = null;
    }
  }, []);

  const initialize = useCallback(() => {
    if (!window.turnstile || !container.current || widget.current || !siteKey) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey, action, theme: 'dark', execution: 'execute', appearance: 'interaction-only',
      callback(token) {
        if (!pending.current) return;
        clearTimeout(pending.current.timer);
        pending.current.resolve(token);
        pending.current = null;
        setError('');
      },
      'error-callback': fail,
      'expired-callback': fail,
    });
  }, [siteKey, action, fail]);

  const setContainer = useCallback((node: HTMLDivElement | null) => {
    if (!node && widget.current) {
      window.turnstile?.remove(widget.current);
      widget.current = null;
    }
    container.current = node;
    if (node) initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
    return () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.reject(new Error('Verification cancelled.'));
        pending.current = null;
      }
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [initialize]);

  const protectedFetch = useCallback((input: string, init: RequestInit = {}): Promise<Response> => {
    // Each upload gets its own single-use token, including concurrent photo batches.
    const request = queue.current.catch(() => {}).then(async () => {
      if (!siteKey) return fetch(input, init);
      setError('');
      const deadline = Date.now() + 15_000;
      while (!widget.current && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      if (!widget.current || !window.turnstile) {
        fail();
        throw new Error('Bot verification is unavailable. Please reload and try again.');
      }
      const token = await new Promise<string>((resolve, reject) => {
        pending.current = { resolve, reject, timer: setTimeout(fail, 90_000) };
        window.turnstile!.reset(widget.current!);
        window.turnstile!.execute(widget.current!);
      });
      const headers = new Headers(init.headers);
      headers.set('x-turnstile-token', token);
      return fetch(input, { ...init, headers });
    });
    queue.current = request;
    return request;
  }, [siteKey, fail]);

  const botCheck = siteKey ? <div className="fixed bottom-4 left-4 z-[100] max-w-[calc(100vw-2rem)]" aria-live="polite">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={initialize} onError={fail} />
    <div ref={setContainer} />
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div> : null;

  return { protectedFetch, botCheck };
}
