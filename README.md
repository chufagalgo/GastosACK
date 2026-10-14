# GASTOSACK

Web app (PWA, mobile-first) para apuntar y consultar gastos: importe, descripción, categoría y fecha, con el total del mes y el desglose por categoría.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma 7 · Supabase (Postgres + Auth) · Vercel.

## Puesta en marcha (una sola vez)

### 1. Supabase (base de datos + login)

1. Entra en <https://supabase.com> → **Start your project** → inicia sesión con GitHub.
2. **New project**:
   - *Name*: `gastosack`
   - *Database Password*: pulsa **Generate a password** y **guárdala** (la necesitas abajo).
   - *Region*: **Central EU (Frankfurt)** o **West EU (Ireland)**.
   - Plan **Free** → **Create new project** (tarda ~2 min).
3. **Claves de la API**: menú izquierdo → ⚙️ **Project Settings** → **API Keys**:
   - *Publishable key* → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - *Secret key* (pulsa el ojo / **Reveal**) → `SUPABASE_SECRET_KEY`
   - En **Data API** está la *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
4. **Cadenas de conexión**: botón **Connect** (arriba del todo) → pestaña **Connection String**:
   - *Transaction pooler* (puerto **6543**) → `DATABASE_URL`, añadiendo `?pgbouncer=true` al final.
   - *Session pooler* (puerto **5432**) → `DIRECT_URL`.
   - En ambas sustituye `[YOUR-PASSWORD]` por la contraseña del paso 2.
5. **Desactivar el registro público** (las cuentas solo se crean desde la app para emails dados de alta):
   **Authentication** → **Sign In / Providers** → desactiva **Allow new users to sign up** → **Save**.

### 2. Variables en local, migraciones y seed

```bash
cp .env.example .env
# rellena .env con los valores de arriba + SEED_ADMIN_EMAIL (tu email)
npm install
npm run db:migrate   # crea las tablas en Supabase
npm run db:seed      # categorías por defecto y la cuenta admin
```

El seed es idempotente: se puede repetir sin duplicar nada.

### 3. Vercel (URL pública)

1. Entra en <https://vercel.com> → inicia sesión con GitHub (plan **Hobby**, gratis).
2. **Add New…** → **Project** → importa el repo `gastosack` → **Import**.
3. Despliega **Environment Variables** y pega:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `DATABASE_URL`, `DIRECT_URL`.
4. **Deploy**.

A partir de aquí, **cada push a `main` se publica solo**, y si hay migraciones nuevas se aplican en el build (`vercel-build`).

### 4. Primer acceso

Abre la URL → **Crea tu cuenta** con el email que pusiste en `SEED_ADMIN_EMAIL`. Solo pueden crear cuenta los emails dados de alta en la tabla `Member`.

## Desarrollo

```bash
npm run dev     # http://localhost:3000
npm test        # tests de la lógica (src/lib/domain)
npm run lint
```

## Notas

- Importes en céntimos (enteros).
- Cada persona puede borrar sus gastos; un admin puede borrar cualquiera.
- Todas las tablas tienen RLS activado sin políticas: solo el servidor (Prisma) accede a los datos.
