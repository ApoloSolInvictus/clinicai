# Lux Aeterna Clinical AI

Sistema hibrido para operar una Web App central en Vercel y un nodo local por clinica en Docker con integracion preparada para OpenClaw.

## Arquitectura

- `apps/web`: dashboard central, API de tareas, reportes, sincronizacion y panel operativo para Vercel.
- `services/local-node`: servicio Docker por cliente/clinica. Ejecuta automatizaciones locales, mantiene cola/eventos y llama OpenClaw cuando el Gateway/runner estan activos.
- `ops/openclaw-runner`: puente HTTP local que ejecuta la CLI oficial de OpenClaw dentro del contenedor y devuelve una respuesta compacta a `local-node`.
- `docker-compose.yml`: levanta el nodo local para probar el flujo antes de publicar en GitHub o Vercel.

## Probar localmente

```bash
npm install
npm run dev
```

La Web App queda normalmente en `http://localhost:3000` o `http://localhost:3001` si el puerto 3000 esta ocupado. El nodo local queda en `http://localhost:8787`.

Si tienes Docker instalado:

```bash
docker compose up --build local-node
npm run dev:web
```

## Variables

Copia `.env.example` a `.env.local` para la Web App o a `.env` para Compose segun el entorno.

Para desarrollo local con alias `.node`, `LOCAL_NODE_URL` y cada `nodeUrl` de `CLINIC_NODE_CONFIG_JSON` deben apuntar al puerto del nodo, por ejemplo `http://clinic-san-jose.node:8787`. Para Vercel o produccion, usa `https://clinic-san-jose.node` solo si ese dominio ya termina TLS y reenvia al nodo por tunel, VPN o reverse proxy seguro. Si escribes `clinic-san-jose.node` sin protocolo, la API central lo normaliza a HTTPS; si usas `localhost`, IP o `host:puerto`, lo trata como HTTP para desarrollo local.

La variable `OPENCLAW_MODE=gateway` conecta el nodo local con un Gateway real de OpenClaw. En esta maquina el Gateway se levanta desde Ubuntu WSL2 con Docker y queda en `http://127.0.0.1:18789`.

Para llamadas reales al modelo, `OPENCLAW_RUNNER_URL=http://host.docker.internal:18889/run` apunta al runner local de OpenClaw. Ese runner usa un archivo de entorno seguro en WSL (`/root/.openclaw-secrets/openai.env`) y no guarda la API key dentro del repositorio.

Usa `OPENCLAW_MODE=mock` solo como fallback sin dependencia externa.

## Flujo hibrido

1. La Web App central crea una tarea de automatizacion.
2. La API central registra la tarea y, en local, la reenvia al nodo de clinica usando `LOCAL_NODE_URL` y `LOCAL_NODE_TOKEN`.
3. El nodo local ejecuta la automatizacion; si `OPENCLAW_RUNNER_URL` esta configurado, manda una orden real a OpenClaw y conserva trazabilidad compacta del modelo.
4. La Web App consume eventos de sincronizacion para reportes, contabilidad y auditoria.

## Playbooks OpenClaw

El nodo local incluye playbooks entrenados para los botones `Ejecutar` de la Web App:

- `agenda`: audita citas, conflictos, horarios medicos y recordatorios.
- `correos`: prepara borradores Email/WhatsApp para revision humana.
- `contabilidad`: prepara cierres diario, semanal o mensual en colones, con gastos, facturas y honorarios medicos.
- `historial`: prepara reportes, recetas e indicaciones bloqueando envio hasta firma medica.
- `gestion-local`: revisa personal, turnos, inventario y alertas internas.
- `sync`: compacta eventos locales para sincronizacion central.

Cuando el runner real de OpenClaw esta vivo, el playbook envia un snapshot compacto al modelo y conserva `modelRun` en la respuesta. Si el modelo o gateway no responden, el playbook local sigue devolviendo acciones trazables para que la demo no se detenga.

## Modulos operativos

La primera version con login incluye menu para `Dashboard`, `Agenda`, `Pacientes`, `Medicos`, `Caja`, `Reportes`, `Automatizaciones` y `Configuracion`. Cada modulo lee datos filtrados por clinica y las plantillas de automatizacion envian tareas al Docker/OpenClaw local autorizado.

## Produccion

Para produccion en Vercel se recomienda que el nodo local haga `pull` de tareas desde la API central o use un tunel seguro/mTLS. No conviene depender de que el navegador de Vercel llame directamente a una red privada de la clinica.

Guia de deploy: [docs/vercel-deploy.md](docs/vercel-deploy.md).
Guia de Firebase Auth: [docs/firebase-auth.md](docs/firebase-auth.md).
