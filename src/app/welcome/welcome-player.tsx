'use client';

import { useEffect, useRef, useState } from 'react';

const buttonClass = 'rounded-full bg-[#374225] px-6 py-3 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#374225] disabled:opacity-60';

export function WelcomePlayer({ firstName, token }: { firstName: string | null; token?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const audioUrl = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const filmStart = useRef(0);
  const playbackVersion = useRef(0);
  const [phase, setPhase] = useState<'ready' | 'loading' | 'greeting' | 'audio-ready' | 'film' | 'continue'>('ready');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const audioElement = audio.current;
    const videoElement = video.current;
    return () => {
      playbackVersion.current++;
      controller.current?.abort();
      audioElement?.pause();
      videoElement?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  async function startFilm(start: number) {
    const version = ++playbackVersion.current;
    controller.current?.abort();
    audio.current?.pause();
    filmStart.current = start;
    setPhase('film');
    if (!video.current) return;
    video.current.currentTime = start;
    try {
      await video.current.play();
    } catch {
      if (version !== playbackVersion.current) return;
      setPhase('continue');
      setNotice('Tap Continue film to start playback.');
    }
  }

  async function playGreeting() {
    const version = playbackVersion.current;
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
    if (!token) return startFilm(0);
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
      setNotice('Your personalized greeting is unavailable, but our film is ready for you.');
      await startFilm(0);
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <section aria-label="Welcome film">
      <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-white shadow-lg">
        <video ref={video} controls={phase === 'film' || phase === 'continue'} playsInline preload="none" poster="/welcome/welcome-v4-poster.jpg" className="aspect-video w-full" aria-label="Nate and Blake’s welcome film" onError={() => setNotice('The film could not load. Please try again later.')}>
          <source src="/welcome/welcome-v4.mp4" type="video/mp4" />
          <track kind="captions" src="/welcome/welcome-v4.en.vtt" srcLang="en" label="English" default />
          Your browser does not support video playback.
        </video>
        {phase !== 'film' && phase !== 'continue' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#faf9f6]/95 p-4 sm:p-8">
            <p className="font-[family-name:var(--font-heading)] text-2xl leading-snug sm:text-4xl">{firstName ? `${firstName}, we’re so glad you’re here.` : 'We’re so glad you’re here.'}</p>
            {(phase === 'ready' || phase === 'loading') && <button type="button" className={buttonClass} disabled={phase === 'loading'} onClick={play}>{phase === 'loading' ? 'Preparing your greeting…' : 'Play our welcome film'}</button>}
            {phase === 'audio-ready' && <button type="button" className={buttonClass} onClick={playGreeting}>Play your greeting</button>}
            {phase === 'greeting' && <p className="text-sm">A little hello from us…</p>}
          </div>
        )}
      </div>
      {/* The visible opening-card text is also the transcript for this short audio. */}
      <audio ref={audio} preload="none" onEnded={() => startFilm(2.45)} onError={() => { setNotice('Please enjoy the original film.'); void startFilm(0); }} />
      <p aria-live="polite" className="mt-4 text-sm">{notice || (phase === 'loading' ? 'Preparing your personalized greeting.' : '')}</p>
      {phase === 'continue' && <button type="button" className={buttonClass} onClick={() => startFilm(filmStart.current)}>Continue film</button>}
      {token && phase !== 'film' && phase !== 'continue' && phase !== 'loading' && <button type="button" className="mt-4 text-sm underline underline-offset-4 focus-visible:outline-2" onClick={() => startFilm(0)}>Watch without the personalized greeting</button>}
    </section>
  );
}
