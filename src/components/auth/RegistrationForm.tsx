import { Button } from "@/components/ui/button";

export function RegistrationForm(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-muted bg-muted/50 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Rejestracja zarządzana przez administratora
        </p>
        <p className="text-sm text-muted-foreground">
          Rejestracja użytkowników jest zarządzana przez administratora systemu. 
          Skontaktuj się z administratorem, aby uzyskać dostęp do systemu.
        </p>
      </div>
      
      <Button asChild className="w-full" variant="outline">
        <a href="/auth/login">Wróć do logowania</a>
      </Button>
    </div>
  );
}

