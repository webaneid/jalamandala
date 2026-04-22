import { AdminLoginForm } from '@/components/admin/login-form';

export const metadata = {
  title: 'Login — Jalamandala Admin',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Jalamandala</h1>
          <p className="text-sm text-muted-foreground">Masuk ke panel admin</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
