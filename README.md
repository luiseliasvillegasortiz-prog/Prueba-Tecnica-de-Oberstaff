# luis-villegas-pruebaTecnica

Resolucion completa de la prueba tecnica "Integracion de Sistemas y Automatizacion" de Climasur.

## Autor

- Nombre: **Luis Villegas**
- Perfil GitHub/GitLab: https://github.com/luiseliasvillegasortiz-prog/Prueba-Tecnica-de-Oberstaff

## Ejecucion rapida para reclutador

### Opcion A - Smoke test automatico (API + ETL)

Desde la raiz del proyecto:

```bash
node .\scripts\recruiter-smoke-test.mjs
```

Este script hace automaticamente:
- `npm install` en `ejercicio_2_api` y `ejercicio_3_etl`
- validacion de endpoints principales (incluye `400` y `404`)
- validacion de dashboard en navegador (`/dashboard`)
- ejecucion ETL (`node sync.js`) y generacion de archivos de salida

### Opcion B - Validacion manual por ejercicio

Sigue las secciones de cada ejercicio mas abajo.

## Estructura del proyecto

```text
luis-villegas-pruebaTecnica/
├── README.md
├── .gitignore
├── scripts/
│   ├── recruiter-smoke-test.mjs
│   └── recruiter-smoke-test.ps1
├── ejercicio_1_sql/
│   ├── schema.sql
│   ├── load_data.sql
│   ├── margen_bruto.sql
│   ├── quick_check.sql
│   └── ejercicio 1 resultado.csv
├── ejercicio_2_api/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts
│       ├── routes/
│       ├── services/
│       ├── schemas/
│       └── public/dashboard.html
├── ejercicio_3_etl/
│   ├── package.json
│   ├── sync.js
│   ├── sync.log
│   └── output/
└── ejercicio_4_propuesta/
    └── propuesta.md
```

## Requisitos previos

- Node.js 20+ (probado con Node.js 24)
- MySQL 8.x (ejercicio 1)
- `local_infile` habilitado en MySQL
- PowerShell (para script automatizado en Windows)

## Ejercicio 1 - SQL

Carpeta: `ejercicio_1_sql/`

### Ejecucion

En cliente MySQL:

```sql
SOURCE ejercicio_1_sql/schema.sql;
SOURCE ejercicio_1_sql/load_data.sql;
SOURCE ejercicio_1_sql/margen_bruto.sql;
```

### Verificacion rapida

```sql
SOURCE ejercicio_1_sql/quick_check.sql;
```

### Consideraciones aplicadas

- Rutas absolutas Windows con `/`
- `LOAD DATA LOCAL INFILE`
- manejo de fechas ISO con `T` via `STR_TO_DATE`
- `SET sql_mode = ''` temporal
- `SET FOREIGN_KEY_CHECKS = 0` temporal durante carga masiva

## Ejercicio 2 - API (TypeScript + Fastify)

Carpeta: `ejercicio_2_api/`

### Instalacion y arranque

```bash
cd ejercicio_2_api
npm install
npm start
```

Servidor por defecto: `http://127.0.0.1:3000`

### Endpoints

- `GET /intervenciones?estado=&provincia=&page=&limit=`
- `GET /intervenciones/:cod`
- `GET /kpis/resumen`
- `GET /dashboard` (vista grafica para navegador)

### Pruebas manuales (PowerShell)

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/kpis/resumen" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://127.0.0.1:3000/intervenciones?page=1&limit=5" | ConvertTo-Json -Depth 3
Invoke-RestMethod "http://127.0.0.1:3000/intervenciones/13027" | ConvertTo-Json -Depth 4
```

### Errores esperados

- `400` para parametros invalidos (ej. `page=0`)
- `404` para `COD_INCIDENCIA` inexistente

## Ejercicio 3 - ETL (Node.js)

Carpeta: `ejercicio_3_etl/`

### Instalacion y ejecucion

```bash
cd ejercicio_3_etl
npm install
node sync.js
```

### Salidas

- `output/interv_analitica_YYYYMMDD_HHmmss.json`
- `output/interv_analitica_YYYYMMDD_HHmmss.csv`
- `sync.log`

### Reglas implementadas

- `Estado_Clasificacion` (`Cerrada` / `Pendiente`)
- `DuracionPlanificada_h` desde `DURACION_PLANIFICADA`
- `HorasImputadas_h` por diferencia `FECHA_FIN - FECHA_INICIO`
- agregados por `COD_INCIDENCIA` de materiales y desplazamientos
- manejo defensivo de parseos invalidos (warning no fatal)
- zona horaria asumida documentada: `Europe/Madrid`

## Ejercicio 4 - Propuesta de valor

Carpeta: `ejercicio_4_propuesta/`

Archivo: `propuesta.md` con:
- hallazgos cuantificados de negocio
- oportunidad operativa
- propuesta tecnica viable
- roadmap de implementacion

## Resultados obtenidos

- SQL:
  - validacion de conteos correcta (`100/108/21/81`)
  - calculo de margen bruto operativo y ordenado DESC
- API:
  - `/kpis/resumen`: `100` intervenciones, `51` cerradas, `49` pendientes
  - filtros/paginacion funcionando
  - errores `400` y `404` validados
  - dashboard responsive en `/dashboard`
- ETL:
  - ejecucion correcta: `filas_procesadas=100`
  - `filas_con_horas_imputadas=74`
  - `filas_sin_horas=26`
  - output JSON y CSV versionado por timestamp
  - logging de incidencias en `sync.log`

## Notas para envio en GitHub

1. Renombrar carpeta raiz a `luis-villegas-pruebaTecnica`.
2. Completar enlace de perfil en este README.
3. Subir el contenido sin `node_modules` (ya cubierto por `.gitignore`).
4. Opcional: ejecutar `node .\scripts\recruiter-smoke-test.mjs` y adjuntar salida en la descripcion del repo/PR.

