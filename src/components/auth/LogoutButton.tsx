import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps): JSX.Element {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/v1/auth/sign-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error("Logout failed:", response.statusText);
      }

      // Always redirect to login page after sign-out attempt
      window.location.href = "/auth/login";
    } catch (error) {
      // Log error but still redirect
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
      window.location.href = "/auth/login";
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoggingOut} variant="ghost" className={className}>
      {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
    </Button>
  );
}
