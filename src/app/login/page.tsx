import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-accent text-4xl text-gold-500 mb-2">
            Nate & Blake
          </p>
          <h1 className="font-heading text-3xl text-cream">
            Welcome
          </h1>
          <div className="relative mt-4 flex justify-center">
            <div className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500" />
          </div>
        </div>
        <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
          <p className="text-center text-olive-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
