import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-accent text-4xl text-gold-500 mb-2">
            Nate & Blake
          </p>
          <h1 className="font-heading text-3xl text-charcoal">
            Welcome
          </h1>
          <div className="gold-line mx-auto mt-4" />
        </div>
        <div className="bg-white rounded-lg shadow-elegant p-8">
          <p className="text-center text-olive-500">Loading...</p>
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
