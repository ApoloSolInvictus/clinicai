# Dominio seguro de nodos OpenClinic

Dominio central de la app:

```text
https://www.7openclinic.com/
```

Dominio general para nodos locales por clinica:

```text
https://{clinicSlug}.node.7openclinic.com
```

Ejemplos:

```text
clinic-san-jose -> https://clinic-san-jose.node.7openclinic.com
clinic-escazu -> https://clinic-escazu.node.7openclinic.com
```

La Web App resuelve el nodo desde el perfil Firebase del usuario. Si el usuario tiene `clinicIds: ["clinic-san-jose"]`, la API central usa el `clinicId` autorizado y construye el nodo con `CLINIC_NODE_BASE_DOMAIN=node.7openclinic.com`.

## Variables en Vercel

Configura en `Production` y `Preview`:

```bash
CLINIC_NODE_IDS=clinic-san-jose,clinic-escazu
CLINIC_NODE_BASE_DOMAIN=node.7openclinic.com
CLINIC_NODE_PUBLIC_URL_TEMPLATE=
LOCAL_NODE_TOKEN=token-global-temporal-o-demo
CLOUDFLARE_ACCESS_CLIENT_ID=xxxxx.access
CLOUDFLARE_ACCESS_CLIENT_SECRET=xxxxx
```

Para tokens por clinica, usa `CLINIC_NODE_CONFIG_JSON` sin repetir la URL:

```json
{
  "clinic-san-jose": {
    "name": "Clinica San Jose",
    "region": "Costa Rica",
    "token": "token-largo-unico-san-jose"
  },
  "clinic-escazu": {
    "name": "Clinica Escazu",
    "region": "Costa Rica",
    "token": "token-largo-unico-escazu"
  }
}
```

Con `CLINIC_NODE_BASE_DOMAIN=node.7openclinic.com`, cada entrada queda publicada como `https://{clinicSlug}.node.7openclinic.com`.

## Variables en cada clinica

Cada Docker local debe usar el mismo `CLINIC_ID` y token configurado arriba:

```bash
CLINIC_ID=clinic-san-jose
CLINIC_NAME="Clinica San Jose"
LOCAL_NODE_TOKEN=token-largo-unico-san-jose
NODE_HEALTH_REQUIRES_TOKEN=true
PORT=8787
OPENCLAW_MODE=gateway
OPENCLAW_GATEWAY_URL=http://host.docker.internal:18789
OPENCLAW_RUNNER_URL=http://host.docker.internal:18889/run
```

Levanta el nodo local:

```bash
docker compose up --build -d local-node
```

## Cloudflare Tunnel por clinica

Usa un tunnel por clinica, porque cada nodo vive en una red local diferente.

1. En Cloudflare, agrega `7openclinic.com` y cambia los nameservers del registrador a Cloudflare.
2. Ve a `Zero Trust > Networks > Connectors > Cloudflare Tunnels`.
3. Crea un tunnel `openclinic-clinic-san-jose`.
4. Elige `cloudflared` y copia el comando de instalacion que muestra Cloudflare en la computadora/servidor de esa clinica.
5. Agrega un Public Hostname:
   - Subdomain: `clinic-san-jose.node`
   - Domain: `7openclinic.com`
   - Type: `HTTP`
   - URL: `localhost:8787`
6. Cloudflare creara o usara un CNAME hacia `<UUID>.cfargotunnel.com`.
7. Repite por cada nueva clinica usando su slug exacto.

Validacion desde OpenClinic:

```text
/api/node-config?clinicId=clinic-san-jose
/api/local-health?clinicId=clinic-san-jose
```

El primero debe devolver `nodeUrl: "https://clinic-san-jose.node.7openclinic.com"` y `hasCloudflareAccess: true` si Access esta configurado.

## Cloudflare Access Service Auth

Para que `*.node.7openclinic.com` no quede abierto al publico:

1. Ve a `Zero Trust > Access controls > Service credentials > Service Tokens`.
2. Crea un service token llamado `openclinic-central-vercel`.
3. Copia `Client ID` y `Client Secret` solo una vez.
4. En `Zero Trust > Access > Applications`, crea una aplicacion self-hosted:
   - Application domain: `*.node.7openclinic.com`
   - Policy action: `Service Auth`
   - Include: el service token `openclinic-central-vercel`
5. Guarda `Client ID` y `Client Secret` en Vercel como:
   - `CLOUDFLARE_ACCESS_CLIENT_ID`
   - `CLOUDFLARE_ACCESS_CLIENT_SECRET`

La API central envia estos headers automaticamente:

```text
CF-Access-Client-Id
CF-Access-Client-Secret
Authorization: Bearer <LOCAL_NODE_TOKEN>
```

## Seguridad recomendada Cloudflare

1. `SSL/TLS > Overview`: usa `Full (strict)` para la web publica. Para Cloudflare Tunnel, el borde publico ya termina TLS y el origen local queda dentro del tunnel.
2. `SSL/TLS > Edge Certificates`: activa `Always Use HTTPS`. Activa HSTS solo despues de verificar que todos los subdominios funcionan por HTTPS.
3. `Security > WAF > Managed rules`: activa Cloudflare Managed Rules.
4. `Security > WAF > Rate limiting rules`:
   - Host termina en `.node.7openclinic.com`
   - Paths `/health`, `/tasks`, `/sync/now`
   - Accion: Managed Challenge o Block si excede el umbral.
5. `Security > Bots`: activa Bot Fight Mode o Super Bot Fight Mode si el plan lo permite.
6. `DNS > Settings`: activa DNSSEC cuando el dominio ya este estable.
7. Rota `LOCAL_NODE_TOKEN` y el Service Token al terminar el mes de prueba si la clinica no continua.

## Onboarding mensual de prueba

1. Crear `clinicId`: `clinic-nombre`.
2. Agregarlo a `CLINIC_NODE_IDS` o `CLINIC_NODE_CONFIG_JSON`.
3. Crear/rotar `LOCAL_NODE_TOKEN`.
4. Crear tunnel `openclinic-clinic-nombre`.
5. Publicar `clinic-nombre.node.7openclinic.com -> localhost:8787`.
6. Asignar claims Firebase al usuario:

```json
{
  "role": "clinic-admin",
  "clinicIds": ["clinic-nombre"],
  "allClinics": false
}
```

7. Validar `/api/node-config?clinicId=clinic-nombre`.
8. Validar `/api/local-health?clinicId=clinic-nombre`.
9. Ejecutar una automatizacion OpenClaw de prueba.
