# Deploy en Vercel

Esta Web App se despliega como proyecto Next.js dentro del monorepo. Docker, OpenClaw Gateway y OpenClaw runner no se suben a Vercel; viven en cada clinica/cliente.

## Configuracion recomendada en Vercel

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: automatico de Vercel o `npm install`
- Build Command: automatico de Vercel o `npm run build`
- Output Directory: automatico (`.next`)

## Variables de entorno

Configura estas variables en `Production` y `Preview`:

- `LOCAL_NODE_URL`: URL publica y segura del nodo local de la clinica, por ejemplo `https://clinic-san-jose.node` cuando hay tunel/proxy TLS. No uses `localhost` en Vercel.
- `LOCAL_NODE_TOKEN`: token compartido para enviar tareas al nodo local.
- `CLINIC_NODE_IDS`: lista separada por comas para publicar clinicas conocidas, por ejemplo `clinic-san-jose,clinic-escazu`.
- `CLINIC_NODE_URL_TEMPLATE`: plantilla general para construir el dominio de cada nodo. Usa `https://{clinicSlug}.nodes.tu-dominio.com` en produccion o `http://{clinicSlug}.node:8787` solo en desarrollo local.
- `CLINIC_NODE_CONFIG_JSON`: overrides multi-clinica con URL, nombre o token por Docker local.
- `NEXT_PUBLIC_FIREBASE_*`: configuracion web de Firebase Auth.
- `FIREBASE_*`: credenciales de Firebase Admin para verificar tokens.

Para una demo rapida, `LOCAL_NODE_URL` puede apuntar a un tunel HTTPS temporal hacia `http://localhost:8787`. Para desarrollo local con archivo hosts, usa `http://clinic-san-jose.node:8787`. Para produccion, usa un dominio publico por clinica, VPN, mTLS, Cloudflare Tunnel, Tailscale Funnel, reverse proxy seguro o un modelo de pull donde el nodo local consulte tareas salientes. Si configuras `clinic-san-jose.node` sin protocolo, la app lo normaliza a `https://clinic-san-jose.node`, lo cual requiere que exista un listener HTTPS en 443.

Guia de Firebase: [firebase-auth.md](firebase-auth.md).

## Comandos CLI

Desde la raiz del monorepo:

```bash
npm install
npm run build
npm i -g vercel
vercel login
vercel link --repo
vercel env pull apps/web/.env.local
vercel --cwd apps/web
vercel --cwd apps/web --prod
```

Si Vercel pregunta por directorio, selecciona `apps/web`.

## Flujo hibrido despues del deploy

1. Usuario entra al dominio de Vercel.
2. La API central crea una tarea en `/api/tasks`.
3. Vercel reenvia la tarea a `LOCAL_NODE_URL`.
4. El nodo Docker local ejecuta OpenClaw y responde.
5. Vercel actualiza el tablero con resultado y sincronizacion.

## Nota importante

El prototipo mantiene estado en memoria para demo. En produccion se debe agregar una base de datos central para usuarios, clinicas, tareas, auditoria y reportes persistentes.
