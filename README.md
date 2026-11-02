# FinanzApp Frontend

Frontend de FinanzApp construido con Next.js, React, TypeScript, NextAuth y
Keycloak. El backend y la guía general están en el repositorio hermano
`finanzappv3`.

## Requisitos

- Node.js y npm.
- Backend disponible en `http://localhost:8080`.
- Keycloak disponible en `http://localhost:8081`.

## Arranque local recomendado

El backend incluye un lanzador que arranca infraestructura, microservicios y
este frontend automáticamente:

```powershell
cd ..\finanzappv3\infra
Set-ExecutionPolicy -Scope Process Bypass
.\start-local.ps1
```

La aplicación queda en `http://localhost:3000`.

Next.js recarga automáticamente los cambios del frontend. El lanzador del
backend también observa los cambios de Java y recursos, recompila el
microservicio afectado y lo reinicia mediante Spring DevTools.

Usuario local:

```text
Email:      local@finanzapp.test
Contraseña: localpass123!
```

## Arranque manual

Crear `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Configurar:

```env
API_GATEWAY_URL=http://localhost:8080
AUTH_SECRET=secreto-largo-y-aleatorio
AUTH_KEYCLOAK_ISSUER=http://localhost:8081/auth/realms/finanzapp
AUTH_KEYCLOAK_ID=finanzapp-frontend
AUTH_KEYCLOAK_SECRET=secreto-del-cliente
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8081/auth/realms/finanzapp
```

Instalar y ejecutar:

```powershell
npm ci
npm run dev
```

## Arquitectura frontend

El frontend utiliza un patrón BFF:

```text
Navegador
   │
   ▼
Next.js /api/*
   │ tokens en servidor
   ▼
API Gateway
```

Las rutas `/api/*` hablan con el gateway desde el servidor de Next.js. El
navegador no recibe el access token de Keycloak.

### Rutas de aplicación

- `/`: landing pública y redirección según autenticación y onboarding.
- `/login`: inicio de sesión mediante Keycloak.
- `/logout`: cierre de sesión.
- `/app`: dashboard protegido.
- `/app/onboarding`: configuración inicial del usuario.
- `/app/movements/create`: creación de movimientos.
- `/app/movements/update/[id]`: edición de movimientos.
- `/app/tags`: listado de etiquetas.
- `/app/tags/create`: creación de etiquetas.
- `/app/tags/[id]`: detalle de etiqueta.
- `/app/user`: perfil y patrimonio neto.

### Rutas BFF

- `/api/auth/[...nextauth]`
- `/api/user`
- `/api/onboarding`
- `/api/ideal-percentage`
- `/api/movements`
- `/api/movements/[id]`
- `/api/movements/tag/[tagId]`
- `/api/tags`
- `/api/tags/[id]`

## Cálculos financieros

El perfil obtiene el patrimonio neto desde el backend mediante la métrica
`netWorth`. La fórmula actual es:

```text
patrimonio inicial + beneficios - gastos
```

El endpoint de ahorros es independiente y no debe utilizarse como sustituto
del patrimonio neto.

## Scripts

```powershell
npm run dev
```

Arranca Next.js en modo desarrollo con Turbopack.

```powershell
npm run lint
```

Ejecuta ESLint.

```powershell
npm run build
```

Genera una compilación de producción.

```powershell
npm start
```

Sirve la compilación de producción previamente generada.

```powershell
npm audit --omit=dev --audit-level=high
```

Comprueba vulnerabilidades de dependencias de producción.

## Producción

En producción se deben configurar las mismas variables con valores remotos y
secretos reales. Nunca se deben subir `.env` ni `.env.local`.

Flujo habitual:

```powershell
npm ci
npm run lint
npm run build
npm start
```

El proceso de Next.js debe poder alcanzar el gateway desde el servidor donde
se ejecuta. El navegador solo necesita acceder al frontend y al issuer público
de Keycloak.

## Seguridad

- No se capturan credenciales de Keycloak directamente en React.
- El login se realiza mediante Authorization Code + PKCE.
- Los tokens permanecen en la sesión HttpOnly gestionada por NextAuth.
- `AUTH_SECRET` debe ser largo, aleatorio y exclusivo por entorno.
- `AUTH_KEYCLOAK_SECRET` nunca debe usar el valor de desarrollo en producción.
- `API_GATEWAY_URL` es una variable de servidor y no debe exponerse como
  `NEXT_PUBLIC_*`.

## Validación CI

GitHub Actions ejecuta:

```text
npm ci
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

## Documentación relacionada

- Backend y arquitectura: `finanzappv3/README.md`.
- Arranque local rápido: `finanzappv3/infra/LOCAL.md`.
- Despliegue remoto: `finanzappv3/infra/DEPLOYMENT.md`.
