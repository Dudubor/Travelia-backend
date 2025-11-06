# 🌐 Backend — Travelia (Node.js + Express na **Render**)

## 📌 Objetivo
Backend em **Node.js + Express** que centraliza autenticação (JWT), regras de negócio, integração com banco (PostgreSQL/Neon ou Render PostgreSQL) e expõe APIs REST para o frontend.  
O deploy contínuo é feito na **Render** com _auto-deploy_ a partir do GitHub (e opcionalmente _gateado_ por testes no GitHub Actions).

---

## ⚙️ Instalação e Execução Local

### 1) Clonar o repositório
```bash
git clone https://github.com/Dudubor/Travelia-backend
cd Travelia-backend
```

### 2) Instalar dependências
```bash
npm install
```

### 3) Variáveis de ambiente
Crie um `.env` na raiz (baseado em `.env.sample`)

### 4) Rodar o servidor
```bash
npm run dev   # desenvolvimento (nodemon)
npm start     # produção (node dist/index.js)
```
> Se usar TypeScript, garanta `build` → `dist/`:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
  },
  "engines": { "node": ">=20" }
}
```

---

## 🚀 Deploy na **Render**

### Opção A — **Web Service** (Node sem Docker)
1. **Create New → Web Service** → conecte seu GitHub.
2. **Root Directory**: `Travelia-backend` (ou a raiz do repo).
3. **Runtime**: Node.
4. **Build Command**: `npm ci && npm run build`
5. **Start Command**: `npm start`
6. **Environment**: _Add Environment Variables_  
   - `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, etc.
7. **Auto-Deploy**: _Yes_ (on `main`).
8. **Region**: próxima ao seu banco (ex.: Oregon/Ohio, Frankfurt, etc.).

> **Importante:** a Render injeta a porta via variável `PORT`.  
> No Express, use `app.listen(process.env.PORT || 3000)`.


### CI com **GitHub Actions** antes do Deploy na Render
Você pode bloquear o _auto-deploy_ até os testes passarem usando **Deploy Hooks** da Render.

1) Crie um **Deploy Hook** na Render (Service → Settings → Deploy Hooks).  
2) Salve a URL em um secret do GitHub: `RENDER_DEPLOY_HOOK`.


---

## 🔑 Credenciais & Segurança

- **Nunca** faça commit do `.env`.
- Use **`.env.sample`** como referência.
- **Render**: mantenha secrets em **Environment Variables** (ou **Secret Files**).
- Se usar **Neon/Postgres externo**, habilite **SSL** (`sslmode=require`) e restrinja IPs (se aplicável).

---

## 🔄 Banco de Dados

- **Neon (recomendado)** ou **Render PostgreSQL** (gerenciado).
- Aplique migrações na Render via **Build Command** ou **Postdeploy Command** (Settings).  
  Ex.: `npm run migrate` (Prisma/Drizzle/Knex).


## 📜 Licença
MIT License
