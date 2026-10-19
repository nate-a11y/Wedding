'use client';

import { useEffect, useRef, useState } from 'react';

const buttonClass = 'rounded-full bg-[#374225] px-6 py-3 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#374225] disabled:opacity-60';

export function WelcomePlayer({ firstName, token }: { firstName: string | null; token?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const audioUrl = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const greetingActive = useRef(false);
  const playbackVersion = useRef(0);
  const [phase, setPhase] = useState<'ready' | 'loading' | 'greeting' | 'audio-ready' | 'buffering' | 'film' | 'continue'>('ready');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const audioElement = audio.current;
    const videoElement = video.current;
    return () => {
      playbackVersion.current++;
      greetingActive.current = false;
      controller.current?.abort();
      audioElement?.pause();
      videoElement?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  async function startFilm() {
    const version = ++playbackVersion.current;
    controller.current?.abort();
    greetingActive.current = false;
    audio.current?.pause();
    setPhase('buffering');
    setNotice('');
    if (!video.current) return;
    video.current.currentTime = 0;
    try {
      await video.current.play();
      if (version === playbackVersion.current) setPhase('film');
    } catch {
      if (version !== playbackVersion.current) return;
      setPhase('continue');
      setNotice('Tap Continue film to start playback.');
    }
  }

  async function playGreeting() {
    const version = playbackVersion.current;
    greetingActive.current = true;
    setNotice('');
    setPhase('greeting');
    try {
      await audio.current?.play();
    } catch {
      if (version !== playbackVersion.current) return;
      setPhase('audio-ready');
      setNotice('Your greeting is ready. Tap Play your greeting to listen.');
    }
  }

  async function play() {
    setNotice('');
    if (!token) return startFilm();
    // Load the opening under the greeting card, never expose the poster during handoff.
    if (video.current) { video.current.preload = 'auto'; video.current.load(); }
    const version = ++playbackVersion.current;
    setPhase('loading');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25_000);
    try {
      const response = await fetch('/api/welcome/audio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }), signal: controller.current.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('audio/mpeg')) throw new Error('Unavailable');
      const blob = await response.blob();
      if (version !== playbackVersion.current) return;
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(blob);
      if (!audio.current) return;
      audio.current.src = audioUrl.current;
      await playGreeting();
    } catch {
      if (version !== playbackVersion.current) return;
      await startFilm();
      setNotice('Your personalized greeting is unavailable, but our film is ready for you.');
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <section aria-label="Welcome film">
      <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-white shadow-lg">
        <video ref={video} controls={phase === 'film'} playsInline preload="none" poster="/welcome/welcome-v4-poster.jpg?v=engagement-kiss-20261019" className="aspect-video w-full" aria-label="Nate and Blake’s welcome film" onError={() => { setNotice('The film could not load. Please try again later.'); setPhase('continue'); }}>
          <source src="/welcome/welcome-v4.mp4?v=engagement-kiss-20261019" type="video/mp4" />
          <track kind="captions" src="/welcome/welcome-v4.en.vtt" srcLang="en" label="English" default />
          Your browser does not support video playback.
        </video>
        {phase !== 'film' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#faf9f6] p-4 sm:p-8">
            <p className="font-[family-name:var(--font-heading)] text-2xl leading-snug sm:text-4xl">{firstName ? `${firstName}, a little hello from us.` : 'We’re so glad you’re here.'}</p>
            {(phase === 'ready' || phase === 'loading') && <button type="button" className={buttonClass} disabled={phase === 'loading'} onClick={play}>{phase === 'loading' ? 'Preparing your greeting…' : 'Play our welcome film'}</button>}
            {phase === 'audio-ready' && <button type="button" className={buttonClass} onClick={playGreeting}>Play your greeting</button>}
            {phase === 'greeting' && <p className="text-sm">With love, Nate &amp; Blake</p>}
            {phase === 'buffering' && <p role="status" className="text-sm">Starting your film…</p>}
            {phase === 'continue' && <button type="button" className={buttonClass} onClick={startFilm}>Continue film</button>}
          </div>
        )}
      </div>
      {/* The visible opening-card text is also the transcript for this short audio. */}
      <audio ref={audio} preload="none" onEnded={() => { if (greetingActive.current) void startFilm(); }} onError={() => { if (greetingActive.current) { void startFilm(); setNotice('Please enjoy the original film.'); } }} />
      <p aria-live="polite" className="mt-4 text-sm">{notice || (phase === 'loading' ? 'Preparing your personalized greeting.' : '')}</p>
      {token && phase !== 'film' && phase !== 'continue' && phase !== 'loading' && phase !== 'buffering' && <button type="button" className="mt-4 text-sm underline underline-offset-4 focus-visible:outline-2" onClick={startFilm}>Watch without the personalized greeting</button>}
    </section>
  );
}
