import { VendorLoginForm } from '@/components/vendor/VendorLoginForm';

export const metadata = {
  title: 'Masuk',
};

export default function VendorLoginPage() {
  return (
    <div
      className="relative min-h-screen text-white flex flex-col items-center justify-center px-5"
      style={{
        background: 'linear-gradient(135deg, #050e1f 0%, #0a1f48 30%, #071630 55%, #040c1a 100%)',
      }}
    >
      {/* Ambient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(19,67,151,0.3) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #134397, #00adee)' }}
          >
            <svg className="size-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 5.5 3h13L21 9.5M3 9.5h18M3 9.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5M9 21V12h6v9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Vendor Portal</h1>
          <p className="mt-1 text-sm text-white/45">FORBIS National Economic Summit 2026</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: 'rgba(13,28,60,0.70)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <VendorLoginForm />
        </div>
      </div>
    </div>
  );
}
