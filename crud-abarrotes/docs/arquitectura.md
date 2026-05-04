# Arquitectura POS TRUE RESPONSIVE

## 1. Tipo de arquitectura
Cliente - Servidor

## 2. Componentes

### Cliente (Frontend)
- HTML, CSS, JS
- Responsive (mobile-first)
- Módulo de escaneo
- Consumo de API REST

### Servidor (Backend)
- Node.js + Express
- Lógica de negocio
- Validaciones
- Control de transacciones

### Base de datos
- SQLite
- Tablas: Producto, Ventas, Inventario, etc.

## 3. Flujo

Usuario → Frontend → API → Base de datos → Respuesta → UI

## 4. Escaneo
- Cámara (BarcodeDetector / ZXing)
- Fallback: entrada manual

## 5. Seguridad
- HTTPS requerido para cámara
- Validación en servidor

## 6. Separación de capas
- UI → frontend
- Dominio → backend modules
- Persistencia → SQLite