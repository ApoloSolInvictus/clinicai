# Firebase Auth por clinica

La Web App usa Firebase Auth para iniciar sesion y Firebase Admin para verificar cada request del backend. El cliente obtiene un ID token y las APIs de Next.js lo validan antes de consultar una clinica o enviar tareas al Docker local.

## 1. Crear Firebase

1. Crea un proyecto en Firebase.
2. En Authentication, habilita `Email/Password`.
3. Crea una Web App dentro del proyecto.
4. Copia la configuracion web a las variables `NEXT_PUBLIC_FIREBASE_*`.

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

## 3. Configurar nodos por clinica

Para varias clinicas, usa `CLINIC_NODE_CONFIG_JSON`:

```json
{
  "clinic-san-jose": {
    "name": "Clinica San Jose",
    "region": "Costa Rica",
    "nodeUrl": "https://clinic-san-jose.node",
    "token": "token-de-esa-clinica"
  },
  "clinic-escazu": {
    "name": "Clinica Escazu",
    "region": "Costa Rica",
    "nodeUrl": "https://clinic-escazu.node",
    "token": "token-de-esa-clinica"
  }
}
```

Cada `nodeUrl` apunta al Docker local de esa clinica, normalmente por dominio `.node`, Cloudflare Tunnel, VPN, mTLS o reverse proxy seguro. Si el valor viene sin protocolo, la API central infiere `https://` para dominios como `clinic-san-jose.node` y `http://` para `localhost`, IPs o hosts con puerto como `clinic-san-jose.node:8787`.

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
