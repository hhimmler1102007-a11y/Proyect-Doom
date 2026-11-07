# EXTRACTION DOOM — Paso gráfico 2

## Texturas y detalles ambientales

- Se añadieron microdetalles procedurales deterministas a las texturas de asfalto, hierba, tierra y muros militares de hormigón: grava, piedras pequeñas, grietas finas, variación de hojas de hierba y desgaste.
- Se conservaron las paletas, las texturas pixel-art base, las dimensiones de textura y los sprites originales.
- Frente de Ceniza ahora genera partículas de ceniza suspendida en el aire; su frecuencia baja con niebla y se desactiva con lluvia.
- Los fuegos activos pueden producir pequeñas brasas ascendentes.
- Las hojas de los parques del Distrito Cero siguen funcionando y ahora se dibujan con su altura original.
- Las partículas ambientales respetan la profundidad de los muros y se mantienen limitadas para reducir el coste de renderizado.

## Compatibilidad

- Sin cambios intencionales en combate, IA, inventario, armas, mapas o generación del mundo.
- HTML autónomo generado en `dist-single/index.html` con `python3 build-single-standalone.py`.
- Verificación: sintaxis de todos los módulos fuente y de los 42 módulos embebidos; 91 recursos incorporados y rutas relativas resueltas.
