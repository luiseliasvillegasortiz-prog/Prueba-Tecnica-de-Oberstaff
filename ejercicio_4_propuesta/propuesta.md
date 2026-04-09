# Propuesta de valor - Climasur

## 1) Hallazgos relevantes en las muestras

### Hallazgo A - Alta carga operativa pendiente y concentrada en correctivo

En las 100 intervenciones analizadas:

- 49 estan en estados pendientes (`Asignado`, `Preasignada`, `Sin Asignar`, `Pendiente`) y 51 cerradas.
- 72 son `Accion Correctiva` (72% del total), frente a 11 de preventivo.
- Solo con estos datos ya se ve una operativa muy reactiva: casi la mitad del trabajo sigue abierto y la mayor parte es correctivo.

**Por que importa para negocio:** en mantenimiento, el exceso de correctivo suele aumentar urgencias, desplazamientos no optimos y riesgo de incumplir ventanas de servicio.

### Hallazgo B - Calidad/completitud desigual en datos de coste y ejecucion

Patrones detectados:

- 26 intervenciones no tienen horas imputadas asociadas (26%).
- 84 no tienen materiales (84%).
- 29 no tienen desplazamientos (29%).
- 26 intervenciones quedan con margen 0 y 11 con margen negativo.

**Por que importa para negocio:** esto puede mezclar dos realidades:
1) intervenciones realmente sin consumo,
2) consumo no registrado o incompleto.

Sin trazabilidad completa, los KPIs economicos y la priorizacion operativa pierden precision.

### Hallazgo C - Distribucion geografica y presion por zona

Distribucion por provincia sede:

- Malaga: 32%
- Sevilla: 19%
- Almeria: 16%
- Cadiz: 14%
- resto: 19%

**Por que importa para negocio:** Malaga y Sevilla concentran 51% de la carga. Si no se prioriza con reglas de riesgo/valor, se incrementan tiempos de espera en zonas con mayor demanda.

## 2) Propuesta concreta de valor

## "Motor de priorizacion y alertas de margen/riesgo" (MVP en 4 semanas)

### Objetivo

Automatizar la priorizacion diaria de intervenciones para reducir backlog pendiente y evitar cierres con margen bajo/negativo.

### Que haria en la practica

1. Calcular un `score_prioridad` por intervencion (0-100) combinando:
   - Estado (pendiente pesa mas).
   - Antiguedad desde `FECHA_INCIDENCIA`.
   - Tipo (correctivo con mayor peso).
   - Riesgo economico (margen historico de casos similares por cliente/zona/tipo).
2. Generar alertas automaticas:
   - `Alerta Margen`: intervenciones con margen previsto <= 0.
   - `Alerta Backlog`: pendientes por zona por encima de umbral.
   - `Alerta Registro`: partes cerrados sin horas imputadas o sin datos clave.
3. Exponer un panel operativo diario:
   - Top pendientes por prioridad.
   - Backlog por provincia.
   - % cierres con margen negativo.
   - % intervenciones sin trazabilidad completa.

## 3) Impacto esperado (estimacion razonable)

Con base en los datos actuales:

- Si se actua primero sobre las 49 pendientes con score alto, se puede reducir backlog operativo en zonas de mayor carga (Malaga/Sevilla).
- Si se corrige registro en intervenciones con datos incompletos (26 sin horas), mejora la fiabilidad del margen y de la facturacion asociada.
- Si se atacan casos de margen negativo (11 actuales), se puede recuperar parte de rentabilidad perdida ajustando asignacion/tiempos/desplazamientos.

## 4) Implementacion tecnica viable

### Stack sugerido

- Ingestion/ETL: Node.js (script actual reutilizable) o Python.
- API: Fastify (ya implementado en ejercicio 2) para exponer KPIs y alertas.
- Persistencia analitica: MySQL (tablas agregadas diarias) o PostgreSQL.
- Visualizacion: Metabase / Grafana / Power BI (arranque rapido con bajo coste).
- Orquestacion: cron diario (Windows Task Scheduler o Linux cron) para ejecucion ETL.

### Arquitectura de alto nivel

1. **Extraccion**: leer CSV/vistas origen.
2. **Transformacion**:
   - clasificacion de estado,
   - calculo de horas y margen,
   - score de prioridad.
3. **Carga**:
   - tabla analitica por intervencion (`interv_analitica`),
   - tabla de alertas (`interv_alertas`).
4. **Consumo**:
   - endpoint `/kpis/resumen`,
   - endpoint `/kpis/prioridades`,
   - endpoint `/kpis/alertas`.
5. **Panel**:
   - backlog por zona/estado,
   - margen por tipo/provincia,
   - calidad de dato operativa.

### Roadmap propuesto

**Semana 1**
- Consolidar ETL diario y tabla analitica estable.
- Definir reglas de calidad de dato y alertas minimas.

**Semana 2**
- Implementar score de prioridad v1.
- Exponer endpoints de prioridades y alertas.

**Semana 3**
- Montar dashboard operativo con filtros por provincia, cliente y estado.
- Validacion con equipo de operaciones.

**Semana 4**
- Ajuste de pesos del score segun feedback real.
- Definir SLAs de seguimiento y reporte semanal de impacto.

## 5) Resumen ejecutivo

La mayor oportunidad no es solo "ver mas KPIs", sino usar los datos para **decidir mejor cada dia**: que atender primero, donde hay riesgo economico y donde falta trazabilidad.  
Con una implementacion ligera (ETL + API + dashboard), Climasur puede reducir backlog pendiente, mejorar margen operativo y estandarizar la calidad del registro tecnico sin redisenar todo su sistema GMAO.
