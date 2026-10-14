import { register } from "../actions";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return <AuthForm mode="registro" action={register} />;
}
