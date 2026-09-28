# 🥭 Maracumango — Sistema de Gestión y Ventas

Sistema web integral de comercio electrónico y gestión operativa para **Maracumango** en Neiva, Huila. Diseñado para ofrecer una experiencia fluida a los clientes al explorar el catálogo de granizados, micheladas y helados artesanales, junto con paneles dedicados para la operación de los trabajadores en cada sede y la administración central del negocio.

---

## 📌 Descripción General

**Maracumango** es una plataforma completa que combina:
1. **Tienda y Menú Digital para Clientes:** Permite explorar productos artesanales por categorías, personalizar adiciones/ingredientes, armar pedidos en el carrito y enviarlos para entrega o retiro.
2. **Panel Operativo para Trabajadores:** Facilita a los operarios de cada sede visualizar comandas en tiempo real y gestionar el ciclo de vida de los pedidos (Pendiente → En Preparación → Listo → Entregado).
3. **Panel Administrativo:** Permite a los administradores gestionar el catálogo de productos, categorías, ingredientes, sedes, personal de trabajo, reportes de ventas y configuraciones comerciales.

---

## 🚀 Funcionalidades Principales

### 🛍️ Menú y Experiencia del Cliente
- **Catálogo Interactivo:** Exploración de productos organizados por categorías (Granizados, Micheladas, Helados Artesanales, etc.).
- **Detalle y Personalización:** Selección de ingredientes, adiciones y notas especiales para la preparación.
- **Carrito de Compras:** Gestión ágil de cantidades, resumen de subtotal y cálculo automático en tiempo real.
- **Registro de Pedidos:** Envío de órdenes especificando modalidad (domicilio o retiro en punto de venta), sede de atención, datos del cliente y método de pago (Efectivo, Nequi, Daviplata o Transferencia bancaria).
- **Canales Oficiales:** Enlaces directos a las redes sociales verificadas de Maracumango (Instagram y Facebook) en el pie de página.

### 🥤 Panel Operativo del Trabajador
- **Filtro por Sede:** Visualización de pedidos correspondientes a la sede asignada al colaborador.
- **Control de Estados:** Actualización inmediata del estado de preparación de cada pedido:
  - *Pendiente*
  - *En Preparación*
  - *Listo para Entrega*
  - *Entregado* / *Cancelado*
- **Detalle de Comandas:** Visualización completa de ítems, adiciones, datos del cliente y dirección de entrega.

### 📊 Panel de Administración Central
- **Dashboard y Métricas:** Indicadores clave de rendimiento, ventas totales, volumen de órdenes y pedidos activos.
- **Gestión de Catálogo:** Creación, edición, activación/desactivación y eliminación lógica de productos, precios e imágenes.
- **Gestión de Categorías e Ingredientes:** Organización taxonómica del menú y control de insumos disponibles.
- **Gestión de Sedes:** Configuración de sedes en Neiva (dirección, teléfono, WhatsApp, horario y estado operativo).
- **Gestión de Personal y Accesos:** Creación de usuarios con roles de Administrador o Trabajador, asignación de sedes y restablecimiento de credenciales seguras.
- **Reportes Analíticos:** Consulta y desglose de pedidos por fecha, estado y sede.
- **Monitoreo del Sistema:** Diagnóstico de conexión y salud con la base de datos Neon PostgreSQL.

---

## 👥 Roles del Sistema

El sistema implementa control de acceso basado en roles (RBAC) con autenticación segura vía tokens JWT:

| Rol | Alcance y Permisos |
| :--- | :--- |
| **Cliente (Público)** | Navegación del menú, consulta de sedes, personalización de productos, carrito de compras y registro de pedidos. No requiere inicio de sesión. |
| **Trabajador** | Acceso autenticado mediante credenciales institucionales. Gestiona los pedidos y comandas operativas de su sede asignada. |
| **Administrador** | Acceso total al sistema: gestión de productos, categorías, inventario de ingredientes, sedes, personal, reportes de ventas y configuración general del negocio. |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:**
  - [React 19](https://react.dev/) — Biblioteca para interfaces de usuario interactivas.
  - [TypeScript](https://www.typescriptlang.org/) — Tipado estático para código mantenible y seguro.
  - [Vite](https://vite.dev/) — Empaquetador y entorno de desarrollo ultra rápido.
  - [Tailwind CSS](https://tailwindcss.com/) — Estilos modernos y diseño responsivo para móviles y escritorio.
  - [Google Fonts & Material Symbols](https://fonts.google.com/) — Tipografías Inter, Plus Jakarta Sans e iconografía.

- **Backend:**
  - [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/) — API REST modular y escalable.
  - [tsx](https://github.com/privatenumber/tsx) — Ejecución directa de TypeScript en el entorno de desarrollo.
  - [JSON Web Token (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken) — Generación y validación de tokens de sesión.
  - [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — Cifrado seguro unidireccional de contraseñas.
  - [cors](https://github.com/expressjs/cors) — Gestión segura de orígenes cruzados.

- **Base de Datos:**
  - [Neon PostgreSQL](https://neon.tech/) — Base de datos relacional PostgreSQL serverless en la nube, con soporte de pooling y conexiones cifradas obligatorias (`SSL`).
  - [pg (node-postgres)](https://node-postgres.com/) — Cliente PostgreSQL con pool de conexiones optimizado.

---

## 🗄️ Base de Datos: Neon PostgreSQL

El proyecto utiliza **Neon PostgreSQL** como motor de persistencia relacional en la nube.
- **Función en el sistema:** Garantiza la persistencia centralizada y atómica de productos, categorías, ingredientes, pedidos, clientes, usuarios, sedes y parámetros del negocio.
- **Políticas de conservación:** Incluye rutinas para la depuración programada y retención de pedidos entregados y cancelados, optimizando el rendimiento de las consultas y manteniendo el historial para auditoría y reportes.

---

## ⚙️ Instalación y Configuración Local

### Prerrequisitos
- **Node.js** (v18.x o superior recomendado)
- **npm** (incluido con Node.js)
- Cuenta o instancia en **Neon PostgreSQL** (o PostgreSQL compatible)

### 1. Clonar o descargar el repositorio
```bash
git clone <url-del-repositorio>
cd maracumango
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto tomando como plantilla `.env.example`:

```bash
cp .env.example .env
```

Configura los valores correspondientes en `.env`:

```env
# Puerto del servidor backend en desarrollo local
PORT=3001
NODE_ENV=development

# Cadena de conexión a Neon PostgreSQL (debe incluir ?sslmode=require)
DATABASE_URL=postgresql://neondb_owner:TU_PASSWORD@ep-tu-endpoint.us-east-2.aws.neon.tech/neondb?sslmode=require

# Clave secreta para la firma segura de tokens JWT
JWT_SECRET=tu_clave_secreta_jwt_para_firmar_sesiones

# Origen permitido para CORS en desarrollo
CORS_ORIGIN=http://localhost:5173
```

> ⚠️ **IMPORTANTE DE SEGURIDAD:** Nunca compartas ni subas tu archivo `.env` a repositorios públicos de control de versiones. El archivo `.gitignore` ya está configurado para excluirlo automáticamente.

### 4. Inicializar la base de datos (Migraciones y Datos Semilla)
Ejecuta los scripts incluidos para crear la estructura de tablas e insertar los datos iniciales de sedes, categorías y administrador predeterminado:

```bash
# Ejecutar migraciones estructurales
npm run db:migrate

# Cargar catálogo y usuarios iniciales (opcional)
npm run db:seed
```

---

## 💻 Ejecución en Modo Desarrollo

Para iniciar tanto el cliente frontend (Vite) como el servidor backend (Express/Node) de manera simultánea en una sola terminal:

```bash
npm run dev
```

El sistema iniciará en:
- **Frontend (Vite):** `http://localhost:5173`
- **Backend API (Express):** `http://localhost:3001`

Si deseas ejecutar los servicios de forma individual:
- Solo cliente: `npm run dev:client`
- Solo servidor: `npm run dev:server`

---

## 🌐 Preparación y Despliegue en Vercel

El proyecto está estructurado y optimizado para desplegarse fácilmente en **Vercel**:

1. **Estructura Fullstack Serverless:**
   - La interfaz estática compilada de React se genera en la carpeta `dist/`.
   - Las rutas del backend se sirven a través de funciones serverless de Vercel mediante `api/index.js` y las reglas definidas en `vercel.json`.

2. **Configuración en Vercel Dashboard:**
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

3. **Variables de Entorno en Vercel:**
   En la sección **Settings → Environment Variables** de tu proyecto en Vercel, agrega las siguientes variables:
   - `DATABASE_URL`: La cadena de conexión a tu base de datos Neon PostgreSQL con `?sslmode=require`.
   - `JWT_SECRET`: Una clave segura y aleatoria para la firma de tokens en producción.
   - `NODE_ENV`: `production`

4. **Despliegue:**
   - Conecta tu repositorio de GitHub / GitLab a Vercel.
   - Vercel detectará el archivo `vercel.json` y compilará tanto la aplicación frontend como las funciones serverless de la API.

---

## 📋 Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el frontend y backend en paralelo para desarrollo. |
| `npm run dev:client` | Inicia únicamente el servidor de desarrollo de Vite. |
| `npm run dev:server` | Inicia únicamente el servidor backend con recarga automática (`tsx watch`). |
| `npm run build` | Compila el proyecto TypeScript y genera el bundle estático de producción con Vite. |
| `npm run lint` | Ejecuta el análisis estático de código mediante `oxlint`. |
| `npm run preview` | Previsualiza localmente la compilación de producción generada en `dist`. |
| `npm run db:migrate` | Ejecuta las migraciones SQL en la base de datos configurada. |
| `npm run db:seed` | Inserta datos semilla iniciales en la base de datos. |

---

## 📄 Licencia

Este proyecto fue desarrollado para **Maracumango Neiva**. Todos los derechos reservados.
