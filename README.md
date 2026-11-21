# 🥭 Maracumango — Sistema de Gestión y Ventas

Sistema web integral de comercio electrónico y gestión operativa para **Maracumango** en Neiva, Huila. Diseñado para ofrecer una experiencia fluida a los clientes al explorar el catálogo de granizados, micheladas y helados artesanales, junto con paneles dedicados para la operación de los trabajadores en cada sede y la administración central del negocio.

> 📖 **Manual de Usuario:** Consulta el [Manual de Usuario Detallado](MANUAL_DE_USUARIO.md) para ver la guía paso a paso de Clientes, Trabajadores de Barra y Administrador.

---

## 📌 Descripción General

**Maracumango** es una plataforma completa que combina:
1. **Tienda y Menú Digital para Clientes:** Permite explorar productos artesanales por categorías, personalizar adiciones/ingredientes, armar pedidos en el carrito y enviarlos para entrega o retiro.
2. **Panel Operativo para Trabajadores:** Facilita a los operarios de cada sede visualizar comandas en tiempo real y gestionar el ciclo de vida de los pedidos (Pendiente → En Preparación → Listo → Entregado).
3. **Panel Administrativo:** Permite a los administradores gestionar el catálogo de productos, categorías, ingredientes, sedes, personal de trabajo, reportes de ventas y configuraciones comerciales.

---

## 🚀 Funcionalidades Principales

### 🛍️ Menú y Experiencia del Cliente
- **Catálogo Interactivo y Sedes Dinámicas:** Exploración de productos por categorías con conteo y nombres dinámicos de sedes físicas sincronizadas en tiempo real en Neiva.
- **Navegación Fluida y Botón Flotante:** Adición de productos con confirmación visual rápida (*"¡Agregado!"*) sin interrupciones molestas del carrito. Un botón flotante responsive (*"Hacer Pedido Ya"*) exhibe la cantidad y el subtotal acumulado permanentemente.
- **Asesor Virtual / Smart FAQ ($0):** Asistente interactivo en la esquina inferior que responde al instante sobre direcciones, medios de pago, sedes abiertas/cerradas, domicilios y contacto directo a WhatsApp sin costos de API ni demoras.
- **Registro Seguro y Habeas Data:** Creación de cuenta y login para clientes con aceptación explícita de Términos y Condiciones y Tratamiento de Datos Personales (Ley 1581 de 2012 de Colombia).
- **Recuperación Criptográfica de Contraseñas:** Soporte de restablecimiento seguro mediante código de 6 dígitos o enlace directo con Token Criptográfico (SHA-256 / 64 hex) enviado por correo electrónico.
- **Autocompletado de Pedidos:** Los datos de contacto y dirección de entrega se guardan en el perfil para autocompletar futuros despachos.
- **Medios de Pago por Transferencia y WhatsApp:** Pagos exclusivos por transferencia electrónica (**Nequi y Bancolombia**) con aviso visual obligatorio de comprobante. Al confirmar, genera la comanda en base de datos y el mensaje estructurado para WhatsApp con las instrucciones de pago.
- **Protección de Sedes Cerradas:** Si una sede es desactivada administrativamente para el día, el sistema la marca como `🔴 Cerrado Hoy` y deshabilita su selección en el checkout.
- **Canales Oficiales:** Enlaces directos a las redes sociales verificadas de Maracumango (Instagram y Facebook) en el pie de página.

### 🥤 Panel Operativo del Trabajador
- **Filtro por Sede:** Visualización de pedidos correspondientes a la sede asignada al colaborador.
- **Aislamiento de Comandas:** Solo visualiza pedidos aprobados previamente por el Administrador (`PENDING_ADMIN` oculto hasta aprobación).
- **Control de Estados:** Actualización inmediata del estado de preparación de cada pedido:
  - *Aceptado*
  - *En Preparación* (con bloqueo atómico de trabajador)
  - *Listo para Entrega*
  - *Entregado*
- **Detalle de Comandas:** Visualización completa de ítems, adiciones, datos del cliente y dirección de entrega.

### 📊 Panel de Administración Central
- **Dashboard y Métricas:** Indicadores clave de rendimiento, ventas totales, volumen de órdenes y pedidos activos.
- **Aprobación Rápida de Pedidos:** Aprobación en un clic de órdenes entrantes (`PENDING_ADMIN` → `ACCEPTED`).
- **Gestión Multi-Sede con Toggle Operativo:** Creación (`+ Nueva Sede`), edición de turnos, eliminación definitiva y botón directo de acción rápida: **`Desactivar Sede (Cerrar Hoy)`** / **`Activar Sede (Abrir Hoy)`** para festivos o mantenimiento.
- **Gestión de Catálogo:** Creación, edición, activación/desactivación y eliminación lógica de productos, precios e imágenes.
- **Gestión de Categorías e Ingredientes:** Organización taxonómica del menú y control de insumos disponibles.
- **Gestión de Personal y Accesos:** Creación de usuarios con roles de Administrador o Trabajador, asignación de sedes y restablecimiento de credenciales seguras (con segregación estricta de cuentas de clientes).
- **Exportación Profesional a Excel (.xlsx) y CSV:** Generación de reportes ejecutivos en formato nativo Excel (.xlsx) con diseño corporativo, métricas clave (KPIs de ventas, pedidos entregados, ticket promedio) y fórmulas matemáticas mediante `exceljs`, además de exportación tradicional CSV con UTF-8 BOM.
- **Monitoreo del Sistema:** Diagnóstico de conexión y salud con la base de datos Neon PostgreSQL.

---

## 👥 Roles del Sistema

El sistema implementa control de acceso basado en roles (RBAC) con autenticación segura vía tokens JWT:

| Rol | Alcance y Permisos |
| :--- | :--- |
| **Cliente (Registrado / Invitado)** | Navegación libre del catálogo y personalización del carrito. Para confirmar y realizar pedidos, se requiere inicio de sesión o creación de cuenta con aceptación obligatoria de Términos y Habeas Data (Ley 1581 de 2012). Guarda datos de contacto y dirección para autocompletar futuros despachos. |
| **Trabajador** | Acceso autenticado mediante credenciales institucionales. Gestiona los pedidos y comandas operativas de su sede asignada. |
| **Administrador** | Acceso total al sistema: aprobación de pedidos, creación de nuevas sedes (`+ Nueva Sede`), gestión de catálogo, inventario de ingredientes, personal, exportación de reportes de ventas y configuración general del negocio. |

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
  - [exceljs](https://github.com/exceljs/exceljs) — Generación de hojas de cálculo ejecutivas (.xlsx) con KPIs y formatos monetarios.
  - [nodemailer](https://nodemailer.com/) — Servicio transaccional de correo para restablecimiento de contraseñas con Resend / SMTP.
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

# Configuración transaccional de correo para recuperación de cuentas (Opcional: Resend o SMTP)
RESEND_API_KEY=re_tu_api_key_de_resend
EMAIL_FROM="Maracumango Neiva" <onboarding@resend.dev>
APP_URL=https://maracumango-theta.vercel.app
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
| `npm test` | Ejecuta la suite integral de 64 pruebas automatizadas en 13 suites (seguridad RBAC, BOLA/IDOR, bloqueo por fuerza bruta, recuperación criptográfica, toggle de sedes y pagos Bancolombia/Nequi) alcanzando 86.4% de cobertura. |
| `npm run lint` | Ejecuta el análisis estático de código mediante `oxlint`. |
| `npm run preview` | Previsualiza localmente la compilación de producción generada en `dist`. |
| `npm run db:migrate` | Ejecuta las migraciones SQL en la base de datos configurada. |
| `npm run db:seed` | Inserta datos semilla iniciales en la base de datos. |

---

## 📄 Licencia

Este proyecto fue desarrollado para **Maracumango Neiva**. Todos los derechos reservados.
