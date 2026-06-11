# Firebase Auth por clinica

La Web App usa Firebase Auth para iniciar sesion y Firebase Admin para verificar cada request del backend. El cliente obtiene un ID token y las APIs de Next.js lo validan antes de consultar una clinica o enviar tareas al Docker local.

## 1. Crear Firebase

1. Crea un proyecto en Firebase.
2. En Authentication, habilita `Email/Password`.
3. En Firestore Database, crea una base en modo produccion para persistir pacientes, medicos, citas, caja y reportes.
4. Crea una Web App dentro del proyecto.
5. Copia la configuracion web a las variables `NEXT_PUBLIC_FIREBASE_*`.

## 2. Variables en Vercel

Cliente:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Servidor:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DEFAULT_CLINIC_ID=clinic-san-jose
```

La `FIREBASE_PRIVATE_KEY` debe quedar en una sola variable. Si viene con saltos de linea escapados, usa `\n`.

Persistencia:

```bash
OPENCLINIC_STATE_STORE=firestore
OPENCLINIC_STATE_COLLECTION=openclinic
OPENCLINIC_STATE_DOCUMENT=central-state
```

La app guarda el estado central en Firestore usando Firebase Admin. Si las credenciales `FIREBASE_*` no existen, desarrollo local cae a memoria; en produccion, configura Firestore para que los registros nuevos no se pierdan entre reinicios o redeploys.

## 3. Configurar nodos por clinica

Para altas rapidas, configura una plantilla general. La API reemplaza `{clinicId}` con el id exacto y `{clinicSlug}` / `{clinic}` con el slug seguro para dominio:

```bash
CLINIC_NODE_IDS=clinic-san-jose,clinic-escazu
CLINIC_NODE_URL_TEMPLATE=http://{clinicSlug}.node:8787
CLINIC_NODE_BASE_DOMAIN=node.7openclinic.com
LOCAL_NODE_TOKEN=token-compartido-o-demo
```

En Vercel o produccion, la plantilla debe ser una URL publica HTTPS con tunel/proxy por clinica, por ejemplo:

```bash
CLINIC_NODE_BASE_DOMAIN=node.7openclinic.com
```

Si hay un `CLINIC_NODE_CONFIG_JSON` viejo y necesitas forzar una URL publica desde Vercel, usa `CLINIC_NODE_PUBLIC_URL_TEMPLATE`; esta variable tiene prioridad sobre el JSON:

```bash
CLINIC_NODE_PUBLIC_URL_TEMPLATE=https://{clinicSlug}.node.7openclinic.com
```

Para overrides por clinica, usa `CLINIC_NODE_CONFIG_JSON`:

```json
{
  "clinic-san-jose": {
    "name": "Clinica San Jose",
    "region": "Costa Rica",
    "nodeUrl": "http://clinic-san-jose.node:8787",
    "token": "token-de-esa-clinica"
  },
  "clinic-escazu": {
    "name": "Clinica Escazu",
    "region": "Costa Rica",
    "nodeUrl": "http://clinic-escazu.node:8787",
    "token": "token-de-esa-clinica"
  }
}
```

Cada `nodeUrl` apunta al Docker local de esa clinica. En desarrollo local con alias `.node`, usa el puerto del nodo como `http://clinic-san-jose.node:8787`. En produccion, usa HTTPS solo si el dominio ya termina TLS y reenvia al nodo por Cloudflare Tunnel, VPN, mTLS o reverse proxy seguro. Si el valor viene sin protocolo, la API central infiere `https://` para dominios como `clinic-san-jose.node` y `http://` para `localhost`, IPs o hosts con puerto como `clinic-san-jose.node:8787`.

Guia del dominio `*.node.7openclinic.com` y Cloudflare: [cloudflare-node-domain.md](cloudflare-node-domain.md).

## 4. Claims de usuario

Cada usuario necesita claims para saber que clinicas puede ver:

```json
{
  "role": "clinic-admin",
  "clinicIds": ["clinic-san-jose"],
  "allClinics": false
}
```

Para un usuario con acceso a todo:

```json
{
  "role": "platform-admin",
  "clinicIds": ["clinic-san-jose", "clinic-escazu"],
  "allClinics": true
}
```

Puedes asignarlos con:

```bash
npm run firebase:claims --workspace apps/web -- usuario@clinica.com clinic-san-jose clinic-admin
npm run firebase:claims --workspace apps/web -- admin@infiniti-ia.com clinic-san-jose,clinic-escazu platform-admin
```

El usuario debe cerrar sesion y volver a entrar para recibir claims nuevos.

## 5. Modo local

Para pruebas sin Firebase, puedes activar temporalmente:

```bash
FIREBASE_AUTH_DISABLED=true
NEXT_PUBLIC_FIREBASE_AUTH_DISABLED=true
```

No uses esa variable en produccion.
