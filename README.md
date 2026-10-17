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
AUTH_PROVIDER_REFRESH_PATH=/refresh
AUTH_TOKEN_REFRESH_BUFFER_SECONDS=60
API_BASE_URL=http://localhost:9999
USERS_API_PATH=/users
ACADEMIC_CALENDAR_API_PATH=/academic-calendar
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
- O login retorna `accessToken`, `refreshToken` e `expiresIn` no body.
- O `expiresIn` e usado para controlar a janela de renovacao do token.
- O `accessToken` e salvo na sessao e o `refreshToken` e mantido no JWT interno para renovacao.
- Antes de expirar, o token tenta ser renovado via `AUTH_PROVIDER_REFRESH_PATH` (padrao `/refresh`) enviando o body:
  - `refreshToken`
  - `grantType: refresh_token`
- Se o refresh falhar, a sessao e invalidada e o usuario volta para login.

As regras de autenticacao ficam no arquivo `auth.ts`.

## Dashboard de usuarios

- As funcionalidades usam a origem configurada em `API_BASE_URL`.
- Em ambientes remotos, `API_BASE_URL` deve usar HTTPS para que o header `Authorization` seja preservado.
- A pagina de usuarios chama `API_BASE_URL + USERS_API_PATH`.
- O calendario letivo chama `API_BASE_URL + ACADEMIC_CALENDAR_API_PATH`.
- O token da sessao e enviado no header `Authorization: Bearer <accessToken>`.
- O resultado e exibido em uma grade paginada com 20 registros por pagina.
