import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const hasError = params.error === "CredentialsSignin";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">Portal ADM</h1>
        <p className="auth-subtitle">Entre com suas credenciais para continuar.</p>

        <form
          className="auth-form"
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              username: formData.get("username"),
              password: formData.get("password"),
              redirectTo: "/dashboard",
            });
          }}
        >
          <div>
            <label className="auth-label" htmlFor="username">
              Usuario
            </label>
            <input
              className="auth-input"
              id="username"
              name="username"
              type="text"
              placeholder="seu.usuario"
              required
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="password">
              Senha
            </label>
            <input
              className="auth-input"
              id="password"
              name="password"
              type="password"
              placeholder="********"
              required
            />
          </div>

          {hasError ? (
            <p className="auth-error">Credenciais inválidas. Tente novamente.</p>
          ) : null}

          <button className="auth-button" type="submit">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
