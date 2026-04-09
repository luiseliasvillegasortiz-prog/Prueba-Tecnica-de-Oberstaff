-- MySQL 8.x
-- Objetivo: calcular margen bruto por intervencion.
-- Se agrega cada tabla hija por separado antes del join para evitar
-- multiplicaciones de filas tipicas de joins 1:N + 1:N + 1:N.

WITH horas_agg AS (
  SELECT
    COD_INCIDENCIA,
    ROUND(SUM(COALESCE(COSTE, 0)), 2) AS coste_horas,
    ROUND(SUM(COALESCE(VENTA, 0)), 2) AS venta_horas
  FROM intervenciones_horas
  GROUP BY COD_INCIDENCIA
),
materiales_agg AS (
  SELECT
    COD_INCIDENCIA,
    ROUND(SUM(COALESCE(UNIDADES, 0) * COALESCE(PRECIO_COSTE, 0)), 2) AS coste_materiales,
    ROUND(SUM(COALESCE(UNIDADES, 0) * COALESCE(PRECIO_VENTA, 0)), 2) AS venta_materiales
  FROM intervenciones_materiales
  GROUP BY COD_INCIDENCIA
),
desplaz_agg AS (
  SELECT
    COD_INCIDENCIA,
    ROUND(SUM(COALESCE(PRECIO_COSTE, 0)), 2) AS coste_desplazamientos,
    ROUND(SUM(COALESCE(PRECIO_VENTA, 0)), 2) AS venta_desplazamientos
  FROM desplazamientos
  GROUP BY COD_INCIDENCIA
)
SELECT
  i.COD_INCIDENCIA,
  i.NUM_INTERVENCION,
  i.ESTADO,
  ROUND(
    COALESCE(h.venta_horas, 0) +
    COALESCE(m.venta_materiales, 0) +
    COALESCE(d.venta_desplazamientos, 0),
    2
  ) AS ventas,
  ROUND(
    COALESCE(h.coste_horas, 0) +
    COALESCE(m.coste_materiales, 0) +
    COALESCE(d.coste_desplazamientos, 0),
    2
  ) AS costes,
  ROUND(
    (
      COALESCE(h.venta_horas, 0) +
      COALESCE(m.venta_materiales, 0) +
      COALESCE(d.venta_desplazamientos, 0)
    ) -
    (
      COALESCE(h.coste_horas, 0) +
      COALESCE(m.coste_materiales, 0) +
      COALESCE(d.coste_desplazamientos, 0)
    ),
    2
  ) AS margen_bruto
FROM intervenciones i
LEFT JOIN horas_agg h
  ON h.COD_INCIDENCIA = i.COD_INCIDENCIA
LEFT JOIN materiales_agg m
  ON m.COD_INCIDENCIA = i.COD_INCIDENCIA
LEFT JOIN desplaz_agg d
  ON d.COD_INCIDENCIA = i.COD_INCIDENCIA
ORDER BY margen_bruto DESC, i.COD_INCIDENCIA ASC;
