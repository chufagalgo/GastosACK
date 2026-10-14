# GASTOSACK

App web (PWA, mobile-first) para registrar los gastos de empresa de ACK Logic y generar cada mes la hoja de liquidación en Excel y un Word con los tickets.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Clientes + km desde ACK Logic, Ajustes, login | ✅ |
| 2 | Gastos + foto + lectura con IA | ⏳ |
| 3 | Exportar Excel (plantilla `templates/Gastos_Marzo.xlsx`) | ⏳ |
| 4 | Exportar Word con los tickets | ⏳ |
| 5 | PWA y pulido | ⏳ |

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Conexión |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ídem, clave *anon* | Conexión (pública: los datos los protege RLS) |
| `GOOGLE_MAPS_API_KEY` | Google Cloud → *Routes API* | Km ida y vuelta a cada cliente |
| `OPENROUTESERVICE_API_KEY` | openrouteservice.org (opcional) | Alternativa gratuita si no hay clave de Google |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Leer los tickets (fase 2) |

Las variables sin `NEXT_PUBLIC_` solo se usan en el servidor y nunca llegan al navegador.
No hace falta la *service role key*: la app trabaja siempre con la sesión del usuario.

> Google ya no deja activar *Distance Matrix API* en proyectos nuevos; la app usa **Routes API**, que hace lo mismo con la misma clave. Si no hay clave, los km se escriben a mano.

## Puesta en marcha

### 1. Supabase

1. <https://supabase.com> → **New project** (`gastosack`, región *West EU* o *Central EU*, plan Free).
2. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
3. **Authentication → Users → Add user → Create new user**: tu email y contraseña, marcando *Auto Confirm User*.
4. Crea las tablas, la seguridad y el bucket de fotos desde tu ordenador:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>   # el ref está en la URL del panel
   npx supabase db push                                  # aplica supabase/migrations
   ```

### 2. Google Maps (km)

1. <https://console.cloud.google.com> → crea un proyecto → **APIs y servicios → Biblioteca** → activa **Routes API**.
2. **Credenciales → Crear credenciales → Clave de API**. Restringe la clave a *Routes API*.
3. Google pide una cuenta de facturación, pero el uso de esta app está muy por debajo del crédito gratuito mensual.

### 3. Vercel

1. <https://vercel.com> → **Add New… → Project** → importa `gastosack`.
2. Pega las variables de entorno de la tabla de arriba → **Deploy**.

Cada push a `main` se publica solo. Si cambia el esquema, vuelve a ejecutar `npx supabase db push`.

### 4. Primer uso

Entra con el usuario del paso 1.3 → **Ajustes**: tu nombre, la dirección de la oficina de ACK Logic y la tarifa €/km → **Clientes**: da de alta los clientes (los km se calculan solos).

## Desarrollo

Requiere Docker para el Supabase local.

```bash
npm install
npx supabase start            # Supabase local (aplica las migraciones)
cp .env.example .env.local    # pon la URL y la anon key que muestra el comando anterior
npm run dev                   # http://localhost:3000
npm test                      # tests de lógica
npm run typecheck && npm run lint
npm run db:types              # regenerar tipos tras cambiar el esquema
```

Test de seguridad (RLS) contra el Supabase local, con los usuarios `hector@test.local` y `otro@test.local` (contraseña `test12345`):

```bash
SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_ANON_KEY=<anon key> npm test
```

## Notas

- Importes en céntimos (enteros); km con un decimal; tarifa con tres decimales.
- Cada gasto de km guarda la tarifa del momento: cambiarla en Ajustes no altera meses ya registrados.
- Los clientes con gastos no se borran: se archivan.
- Todas las tablas y el bucket `receipts` tienen RLS: cada usuario solo ve sus datos.
- El plan Free de Supabase pausa el proyecto tras 7 días sin actividad; se reactiva desde el panel.
