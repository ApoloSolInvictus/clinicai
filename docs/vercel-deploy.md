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
- `CLINIC_NODE_PUBLIC_URL_TEMPLATE`: override publico con prioridad sobre JSON y plantilla local. Util para Vercel, por ejemplo `https://{clinicSlug}.nodes.tu-dominio.com` o un tunel temporal `https://abc.trycloudflare.com`.
- `CLINIC_NODE_CONFIG_JSON`: overrides multi-clinica con URL, nombre o token por Docker local.
- `NEXT_PUBLIC_FIREBASE_*`: configuracion web de Firebase Auth.
- `FIREBASE_*`: credenciales de Firebase Admin para verificar tokens.
- `OPENCLINIC_STATE_STORE`: usa `firestore` en produccion para persistir el estado central.
- `OPENCLINIC_STATE_COLLECTION` y `OPENCLINIC_STATE_DOCUMENT`: ubicacion del documento Firestore; por defecto `openclinic/central-state`.

Para una demo rapida, `LOCAL_NODE_URL` puede apuntar a un tunel HTTPS temporal hacia `http://localhost:8787`. Para desarrollo local con archivo hosts, usa `http://clinic-san-jose.node:8787`. Para produccion, usa un dominio publico por clinica, VPN, mTLS, Cloudflare Tunnel, Tailscale Funnel, reverse proxy seguro o un modelo de pull donde el nodo local consulte tareas salientes. Si configuras `clinic-san-jose.node` sin protocolo, la app lo normaliza a `https://clinic-san-jose.node`, lo cual requiere que exista un listener HTTPS en 443.

Si Vercel sigue mostrando `http://clinic-san-jose.node:8787`, revisa `CLINIC_NODE_CONFIG_JSON`: un JSON viejo puede estar sobreescribiendo la plantilla. Para una correccion rapida, define `CLINIC_NODE_PUBLIC_URL_TEMPLATE` con la URL HTTPS publica; esa variable tiene prioridad.

Puedes validar que Vercel tomo la variable con:

```text
/api/node-config?clinicId=clinic-san-jose
```

Debe mostrar `cloudRuntime: true`, `hasPublicTemplate: true` y un `nodeUrl` HTTPS publico. Si `nodeUrl` sigue siendo `http://clinic-san-jose.node:8787`, la variable no quedo aplicada al entorno correcto o falta redeploy.

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

## Persistencia central

La Web App guarda pacientes, medicos, citas, caja, tareas y reportes en Firestore cuando Firebase Admin esta configurado. Antes de publicar, crea Firestore Database en el proyecto Firebase y verifica que Vercel tenga `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` y `OPENCLINIC_STATE_STORE=firestore`.

En desarrollo local sin credenciales Firebase Admin, la app conserva el fallback de memoria para demos rapidas.
