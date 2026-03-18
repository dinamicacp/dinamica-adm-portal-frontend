# dinamica-adm-portal-frontend

Exemplo de página de login com Next.js + NextAuth (Auth.js) usando provider customizado de credenciais.

## Instalação

```bash
bun install
```

## Variáveis de ambiente

Crie um arquivo `.env.local` com:

```bash
AUTH_SECRET=sua-chave-secreta-bem-forte
NEXTAUTH_URL=http://localhost:3000
AUTH_PROVIDER_BASE_URL=http://localhost:9999
AUTH_PROVIDER_LOGIN_PATH=/login
```

Você pode gerar um secret com:

```bash
openssl rand -base64 32
```

## Rodar em desenvolvimento

```bash
bun run dev
```

## Fluxo de autenticacao

- A tela de login envia usuario e senha para o Credentials Provider.
- O provider chama sua API em `AUTH_PROVIDER_BASE_URL + AUTH_PROVIDER_LOGIN_PATH`.
- O header `Authorization` e enviado no formato Basic com usuario e senha.
- O JWT retornado no body no campo `token` e salvo na sessao.

As regras de autenticacao ficam no arquivo `auth.ts`.
