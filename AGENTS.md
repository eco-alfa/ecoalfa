# Instrucciones del proyecto

- Toda lógica de fechas, calendarios, comparaciones de "hoy" y visualización de horas debe usar la zona horaria de Colombia: `America/Bogota`.
- Las claves de fecha para citas se manejan como `YYYY-MM-DD` (`dateKey`) salvo compatibilidad explícita con datos legados.
- Permisos Firestore: médicos pueden crear/actualizar inventario y movimientos (salida por venta), y crear facturas. Admin y operador también tienen estos permisos.
- Facturación POS: permite buscar paciente por cédula/nombre; si no se encuentra, permite escribir nombre libre.
- Impresión: POS tiene ticket térmico y factura carta; historial clínico tiene PDF completo y prescripción sola.
