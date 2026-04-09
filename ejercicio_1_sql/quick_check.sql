-- Verificacion rapida posterior a carga de datos (MySQL)

SELECT 'intervenciones' AS tabla, COUNT(*) AS filas FROM intervenciones
UNION ALL
SELECT 'intervenciones_horas', COUNT(*) FROM intervenciones_horas
UNION ALL
SELECT 'intervenciones_materiales', COUNT(*) FROM intervenciones_materiales
UNION ALL
SELECT 'desplazamientos', COUNT(*) FROM desplazamientos;

-- Top 10 por margen bruto para validacion visual de resultado
SOURCE ejercicio_1_sql/margen_bruto.sql;
