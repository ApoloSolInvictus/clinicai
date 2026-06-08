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

- `LOCAL_NODE_URL`: URL publica y segura del nodo local de la clinica. No uses `localhost` en Vercel.
- `LOCAL_NODE_TOKEN`: token compartido para enviar tareas al nodo local.

Para una demo rapida, `LOCAL_NODE_URL` puede apuntar a un tunel HTTPS temporal hacia `http://localhost:8787`. Para produccion, usa VPN, mTLS, Cloudflare Tunnel, Tailscale Funnel, reverse proxy seguro o un modelo de pull donde el nodo local consulte tareas salientes.

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
