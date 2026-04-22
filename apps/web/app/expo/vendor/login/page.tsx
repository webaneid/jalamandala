import { VendorLoginForm } from '@/components/vendor/VendorLoginForm';

export const metadata = {
  title: 'Login — Vendor Portal',
};

export default function VendorLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Vendor Portal</h1>
          <p className="text-sm text-muted-foreground">FORBIS National Economic Summit 2026</p>
        </div>
        <VendorLoginForm />
      </div>
    </div>
  );
}
