import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { isAdmin } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const hasError = (await searchParams).error === "1";
  return (
    <main className="login-page">
      <div className="login-card">
        <Logo />
        <p className="eyebrow">Área restringida</p>
        <h1>Panel editorial</h1>
        <p>Ingresa la contraseña configurada en <code>ADMIN_PASSWORD</code>.</p>
        <form action={loginAction}>
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required autoFocus />
          {hasError ? <p className="form-error">Contraseña incorrecta.</p> : null}
          <button className="button button-dark" type="submit">Ingresar</button>
        </form>
      </div>
    </main>
  );
}
