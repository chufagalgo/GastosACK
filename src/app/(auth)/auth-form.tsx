"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "./actions";

interface Props {
  mode: "login" | "registro";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  notice?: string;
}

export function AuthForm({ mode, action, notice }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{isLogin ? "Entrar" : "Crear cuenta"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Accede con el email que tienes dado de alta en GASTOSACK."
            : "Usa el email que te han dado de alta y elige una contraseña."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </div>
          {(state.error || notice) && (
            <p role="alert" className="text-sm text-destructive">
              {state.error ?? notice}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                ¿Primera vez? <Link className="underline" href="/registro">Crea tu cuenta</Link>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta? <Link className="underline" href="/login">Entra</Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
