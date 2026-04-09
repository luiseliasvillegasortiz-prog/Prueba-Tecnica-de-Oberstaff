---
name: plan
description: Plan and execute the Climasur technical test end-to-end (SQL, Node.js API, ETL script, and business proposal) with required structure, validation rules, and deliverables. Use when the user asks to solve or organize this specific technical challenge.
---

# Plan - Prueba Tecnica Climasur

## Objetivo

Usa este skill cuando el usuario quiera resolver la prueba tecnica de Climasur con los 4 ejercicios, manteniendo una estructura de proyecto clara y una ejecucion reproducible.

## Configuracion Fija del Plan

Estas decisiones quedan bloqueadas para todo el trabajo:

1. Esquema de trabajo: fases secuenciales.
2. API: TypeScript + Fastify.
3. Motor SQL de referencia: MySQL.
4. ETL: generar JSON y CSV.
5. Idioma de entregables: espanol.
6. Redondeo de importes KPI/SQL: 2 decimales.
7. Fechas invalidas en ETL: intentar reparar formatos comunes; si falla, warning no fatal.
8. Convencion de commits recomendada: Conventional Commits.
9. Arquitectura API obligatoria: modular basica (`src/routes`, `src/services`, `src/schemas`).
10. Validacion final obligatoria por ejercicio: ejecucion + evidencia + checklist.

## Enfoque General

1. Trabaja por fases y valida cada ejercicio antes de continuar.
2. Mantiene cada ejercicio autocontenido.
3. Prioriza robustez basica y legibilidad sobre sobrearquitectura.
4. Maneja datos vacios o mal formados de forma defensiva.
5. Entrega artefactos ejecutables y documentados.
6. Escribe comentarios explicativos en el codigo para dejar claro por que se hace cada paso clave.
7. Instala todas las dependencias necesarias antes de ejecutar y valida que el proyecto arranca sin paquetes faltantes.

## Regla de Comentarios en Codigo (Obligatoria)

Cuando implementes codigo, incluye comentarios de intencion en puntos no triviales para facilitar mantenimiento por terceros.

Directrices:

1. Explica el motivo de decisiones (reglas de negocio, defensas ante datos sucios, trade-offs), no solo el que.
2. Documenta supuestos importantes (por ejemplo zona horaria asumida, politica de redondeo, tratamiento de nulls).
3. Antes de bloques de transformacion/validacion, deja un comentario breve de objetivo y riesgo que evita.
4. Evita comentarios redundantes en lineas obvias.
5. Si aplicas una regla del enunciado, anotalo explicitamente en comentario para trazabilidad.

## Estructura Objetivo

Crea o valida esta estructura:

```text
nombre-apellido/
├── README.md
├── muestras/
│   ├── vista_climasur_intervenciones.csv
│   ├── vista_climasur_intervenciones_horas.csv
│   ├── vista_climasur_intervenciones_materiales.csv
│   └── vista_climasur_desplazamientos.csv
├── ejercicio_1_sql/
│   ├── schema.sql
│   └── margen_bruto.sql
├── ejercicio_2_api/
│   ├── package.json
│   └── server.js
├── ejercicio_3_etl/
│   ├── sync.js
│   ├── output/
│   └── sync.log
└── ejercicio_4_propuesta/
    └── propuesta.md
```

## Fase 0 - Exploracion de Datos

Antes de codificar:

1. Inspecciona cabeceras y tipos aparentes en los 4 CSV.
2. Verifica cardinalidad por `COD_INCIDENCIA`.
3. Cuenta estados, tipos y provincias para confirmar consistencia.
4. Detecta campos vacios y formatos conflictivos (`DURACION_PLANIFICADA`, fechas ISO, importes).

Salida minima:
- Resumen corto de hallazgos.
- Reglas de limpieza que vas a aplicar.

## Fase 1 - Ejercicio SQL

Archivos:
- `ejercicio_1_sql/schema.sql`
- `ejercicio_1_sql/margen_bruto.sql`

### Reglas de modelado

1. `intervenciones` usa `COD_INCIDENCIA` como PK de negocio (texto si no es numeric puro).
2. En horas/materiales/desplazamientos:
   - Si hay identificador confiable en CSV, usarlo como PK.
   - Si no, usar PK tecnica autogenerada y documentarlo en comentario SQL.
3. FK hacia `intervenciones(COD_INCIDENCIA)`.
4. Tipos recomendados:
   - Importes: `NUMERIC(12,2)` o equivalente.
   - Fechas/hora: `TIMESTAMP`.
   - Texto variable: `TEXT` o `VARCHAR`.

### Consulta de margen bruto

Calcula por intervencion:

- `ventas = SUM(horas.venta) + SUM(materiales.unidades * materiales.precio_venta) + SUM(desplazamientos.precio_venta)`
- `costes = SUM(horas.coste) + SUM(materiales.unidades * materiales.precio_coste) + SUM(desplazamientos.precio_coste)`
- `margen_bruto = ventas - costes`

Requisitos:
- Evita duplicidades por joins 1:N usando CTEs agregadas por tabla.
- Usa `COALESCE` para nulos.
- Ordena por `margen_bruto DESC`.

## Fase 2 - Ejercicio API (Node.js)

Carpeta: `ejercicio_2_api/`

Stack obligatorio:
- `typescript`
- `fastify`
- `csv-parse` o `papaparse`
- `zod` para validacion

Arquitectura obligatoria:
- `src/routes`
- `src/services`
- `src/schemas`

### Endpoints obligatorios

1. `GET /intervenciones`
   - Query params: `estado`, `provincia`, `page`, `limit`
   - `estado` y `provincia`: match exacto case-insensitive.
   - Devuelve al menos: `data`, `page`, `limit`, `total`.
2. `GET /intervenciones/:cod`
   - Devuelve detalle de intervencion + arrays de horas/materiales/desplazamientos.
   - `404` si no existe.
3. `GET /kpis/resumen`
   - `total_intervenciones`
   - `total_cerradas`
   - `total_pendientes`
   - `coste_total`
   - `venta_total`

### Reglas funcionales

Estados cerrada:
- `Finalizado`, `Albaranado`, `No facturar`, `Anulado`

Estados pendiente:
- `Asignado`, `Preasignada`, `Sin Asignar`, `Pendiente`

Manejo de errores:
- `400` para parametros invalidos
- `404` para recurso no encontrado

### Calidad minima

1. Carga de CSV en memoria al arrancar.
2. Indices en memoria por `COD_INCIDENCIA` para acceso eficiente.
3. Validacion centralizada con esquemas (sin validaciones dispersas).
4. Arranque con `npm install && npm start`.
5. Comentarios de intencion en rutas, servicios y validaciones.
6. Dependencias instaladas y declaradas en `package.json` (sin dependencias huerfanas).

## Fase 3 - Ejercicio ETL

Carpeta: `ejercicio_3_etl/`

Comando de ejecucion:
- `node sync.js` (o `python sync.py`)

### Transformaciones requeridas

1. `Estado_Clasificacion` desde `ESTADO`:
   - Cerrada: `Finalizado`, `Albaranado`, `No facturar`, `Anulado`
   - Pendiente: `Asignado`, `Preasignada`, `Sin Asignar`, `Pendiente`
2. `DuracionPlanificada_h`:
   - Convierte `HH:MM` a decimal.
   - Si vacio/invalido => `0`.
3. `HorasImputadas_h`:
   - Suma `FECHA_FIN - FECHA_INICIO` por intervencion.
   - Ignora filas no parseables y registra warning en log.
   - Documenta zona horaria asumida (`Europe/Madrid` recomendado).
4. Agregados por intervencion:
   - `ImporteCoste` (materiales)
   - `ImporteVenta` (materiales)
   - `CosteDesplaz`
   - `VentaDesplaz`

### Carga / salida

1. Genera `output/interv_analitica_YYYYMMDD_HHmmss.json` (o `.csv`).
2. Debe contener exactamente las mismas 100 filas base de intervenciones.
3. Si no hay datos agregados asociados, representar como `null` (JSON) o vacio (CSV). No usar `NaN`.

### Logging

Registrar en `sync.log` por ejecucion:
- timestamp
- filas procesadas
- filas con horas imputadas
- filas sin horas
- warnings de parseo no fatales

Regla adicional:
- Si se intenta reparar una fecha y falla, registrar valor original + motivo del fallo.

## Fase 4 - Propuesta de Valor

Archivo: `ejercicio_4_propuesta/propuesta.md`

### Contenido minimo

1. Al menos 2 problemas u oportunidades detectados en datos.
2. Evidencia cuantitativa (porcentajes, conteos, importes, distribuciones).
3. 1 propuesta concreta de funcionalidad/automatizacion.
4. Implementacion viable: tecnologia, arquitectura alto nivel, pasos.
5. Foco en valor de negocio para empresa de mantenimiento.

### Enfoque recomendado

- Vincula cada hallazgo con impacto operativo (coste, tiempo, SLA, productividad tecnica, facturacion).
- Evita propuestas genericas sin cifra ni accion.

## Fase 5 - README y Entrega

`README.md` debe incluir:

1. Requisitos previos.
2. Pasos de instalacion y ejecucion por ejercicio.
3. Ejemplos de uso API (curl o similares).
4. Como ejecutar ETL y localizar salida.
5. Enlace al perfil de GitHub/GitLab del autor.

## Checklist de Validacion Final

- [ ] Estructura de carpetas cumple el enunciado.
- [ ] `schema.sql` y `margen_bruto.sql` ejecutan sin errores.
- [ ] Consulta SQL devuelve margen correctamente ordenado.
- [ ] API arranca con `npm install && npm start`.
- [ ] API responde con codigos `200/400/404` correctos.
- [ ] `/kpis/resumen` aplica clasificacion de estado requerida.
- [ ] ETL ejecuta con un solo comando y genera output versionado por timestamp.
- [ ] `sync.log` registra incidencias no fatales.
- [ ] Tabla analitica mantiene 100 filas base.
- [ ] `propuesta.md` incluye hallazgos cuantificados y propuesta viable.

## Plantilla Estricta por Ejercicio (Obligatoria)

Usa exactamente esta plantilla en cada ejercicio para planificar y verificar.

### Bloque 1 - Objetivo

- Que se debe entregar.
- Restricciones obligatorias del enunciado.

### Bloque 2 - Criterios de Aceptacion

- Lista cerrada de condiciones verificables.
- Incluye formato de salida esperado.

### Bloque 3 - Implementacion Paso a Paso

- Paso 1, Paso 2, Paso 3... sin saltos.
- En cada paso, indicar archivo(s) tocado(s).
- Incluir comentario de intencion esperado en el codigo.

### Bloque 4 - Comandos de Ejecucion

- Comando exacto para correr.
- Comando exacto para validar.
- Incluir instalacion de dependencias como paso explicito (`npm install`).

### Bloque 5 - Evidencia Obligatoria

- Evidencia de ejecucion correcta.
- Evidencia de salida (JSON/CSV/SQL/HTTP segun aplique).
- Evidencia de instalacion de dependencias sin errores.
- Checklist marcado item por item.

### Bloque 6 - Riesgos y Mitigaciones

- Riesgos detectados.
- Como se mitigan dentro de la solucion.

## Criterio de Priorizacion

Si hay restriccion de tiempo:

1. Asegura funcionamiento correcto de ejercicios 1, 2 y 3.
2. Luego mejora propuesta de valor y documentacion.
3. Prefiere una solucion simple y completa frente a una compleja e incompleta.
