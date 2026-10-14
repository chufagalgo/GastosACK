import { login } from "../actions";
import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const notice =
    error === "sin-acceso"
      ? "Tu cuenta no está vinculada a ningún miembro activo. Habla con un administrador."
      : undefined;
  return <AuthForm mode="login" action={login} notice={notice} />;
}
