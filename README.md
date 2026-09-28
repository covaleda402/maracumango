# 🥭 Maracumango — Sistema de Gestión y Ventas

Sistema web desarrollado para **Maracumango**, negocio ubicado en Neiva, Huila. La plataforma integra un catálogo digital para clientes y herramientas de gestión para trabajadores y administradores.

El proyecto busca facilitar la gestión de pedidos, productos, sedes y operaciones diarias del negocio desde una sola plataforma.

---

## 📌 Descripción

Maracumango cuenta con tres áreas principales:

* **Cliente:** consulta el catálogo, personaliza productos, agrega productos al carrito y realiza pedidos para domicilio o recogida en tienda.
* **Trabajador:** consulta y gestiona los pedidos correspondientes a su sede, actualizando su estado durante la preparación.
* **Administrador:** administra productos, categorías, ingredientes, sedes, usuarios y consulta información relacionada con las ventas y pedidos.

---

## 🚀 Funcionalidades principales

### 🛍️ Área del cliente

* Catálogo de productos organizado por categorías.
* Visualización de información y precios de los productos.
* Selección de ingredientes y adiciones disponibles.
* Carrito de compras.
* Registro de pedidos.
* Selección entre **domicilio** o **recogida en tienda**.
* Selección del método de pago:

  * Nequi
  * Efectivo
* Consulta de las sedes disponibles.
* Acceso a los canales oficiales de Maracumango.

### 👨‍🍳 Área del trabajador

* Acceso mediante usuario y contraseña.
* Visualización de pedidos correspondientes a la sede asignada.
* Consulta del detalle de cada pedido.
* Actualización del estado de preparación:

  * Pendiente
  * En preparación
  * Listo
  * Entregado
* Gestión de pedidos cancelados según los permisos establecidos.
* El trabajador no puede modificar la información administrativa del negocio.

### 👨‍💼 Área administrativa

* Dashboard con información general de pedidos y ventas.
* Creación, edición y desactivación de productos.
* Gestión de precios e imágenes de productos.
* Gestión de categorías.
* Gestión de ingredientes y adiciones.
* Administración de sedes.
* Configuración de información comercial de las sedes.
* Creación y administración de usuarios.
* Asignación de roles y sedes a los trabajadores.
* Consulta de pedidos y reportes.
* Gestión de la información general del negocio.

---

## 👥 Roles del sistema

El sistema utiliza control de acceso basado en roles (RBAC).

| Rol               | Permisos principales                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Cliente**       | Consultar el catálogo, personalizar productos, utilizar el carrito y realizar pedidos.               |
| **Trabajador**    | Consultar y gestionar los pedidos de la sede que tiene asignada.                                     |
| **Administrador** | Gestionar productos, categorías, ingredientes, sedes, usuarios, pedidos y configuración del sistema. |

El cliente no necesita crear una cuenta para realizar un pedido.

---

## 🛠️ Tecnologías utilizadas

### Frontend

* **React 19** — Construcción de la interfaz de usuario.
* **TypeScript** — Desarrollo con tipado estático.
* **Vite** — Entorno de desarrollo y compilación.
* **Tailwind CSS** — Diseño y estilos responsivos.

### Backend

* **Node.js** — Entorno de ejecución.
* **Express 5** — Construcción de la API REST.
* **tsx** — Ejecución de TypeScript durante el desarrollo.
* **JSON Web Token (JWT)** — Autenticación y manejo de sesiones.
* **bcryptjs** — Hash seguro de contraseñas.
* **CORS** — Control de solicitudes entre diferentes orígenes.

### Base de datos

* **Neon PostgreSQL** — Base de datos PostgreSQL alojada en la nube.
* **node-postgres (pg)** — Conexión entre el backend y PostgreSQL.

---

## 🗄️ Base de datos

Maracumango utiliza **PostgreSQL mediante Neon** para almacenar la información principal del sistema.

La base de datos permite mantener de forma persistente información como:

* Productos.
* Categorías.
* Ingredientes y adiciones.
* Pedidos.
* Usuarios.
* Sedes.
* Configuración del negocio.

El proyecto incluye migraciones SQL para crear y actualizar la estructura de la base de datos, además de datos iniciales para facilitar la configuración del sistema.

---

## ⚙️ Instalación y configuración local

### Requisitos

* **Node.js** 18.x o superior.
* **npm**.
* Una base de datos PostgreSQL compatible, como Neon.

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd maracumango
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Crea un archivo `.env` en la raíz del proyecto utilizando `.env.example` como referencia.

Ejemplo:

```env
PORT=3001
NODE_ENV=development

DATABASE_URL=postgresql://usuario:contraseña@host/neondb?sslmode=require

JWT_SECRET=tu_clave_secreta

CORS_ORIGIN=http://localhost:5173
```

> ⚠️ **Importante:** el archivo `.env` contiene información sensible y no debe subirse al repositorio. El archivo `.gitignore` está configurado para excluirlo.

### 4. Preparar la base de datos

Ejecuta las migraciones:

```bash
npm run db:migrate
```

Para cargar los datos iniciales:

```bash
npm run db:seed
```

---

## 💻 Ejecución en desarrollo

Para iniciar el proyecto:

```bash
npm run dev
```

Durante el desarrollo se utilizan:

* **Frontend:** `http://localhost:5173`
* **Backend:** `http://localhost:3001`

También es posible ejecutar cada parte por separado:

```bash
npm run dev:client
```

```bash
npm run dev:server
```

---

## 🌐 Despliegue en Vercel

El proyecto está preparado para desplegarse en **Vercel** utilizando su estructura de frontend y funciones serverless.

### Configuración principal

* **Framework:** Vite
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Install Command:** `npm install`

El proyecto incluye:

* `vercel.json` para la configuración del despliegue.
* `api/index.ts` como punto de entrada de la API.
* Vite para la compilación del frontend.

### Variables de entorno

Las siguientes variables deben configurarse en el proyecto de Vercel:

```text
DATABASE_URL
JWT_SECRET
NODE_ENV
```

Los valores deben corresponder al entorno de producción.

### Despliegue

El proyecto puede conectarse a un repositorio de GitHub y desplegarse desde Vercel. Cada nuevo despliegue puede realizarse a partir de los cambios enviados al repositorio.

---

## 📋 Comandos disponibles

| Comando              | Descripción                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Inicia frontend y backend en desarrollo.     |
| `npm run dev:client` | Inicia únicamente el frontend.               |
| `npm run dev:server` | Inicia únicamente el backend.                |
| `npm run build`      | Compila el proyecto para producción.         |
| `npm run lint`       | Analiza el código mediante Oxlint.           |
| `npm run preview`    | Previsualiza la compilación de producción.   |
| `npm run db:migrate` | Ejecuta las migraciones de la base de datos. |
| `npm run db:seed`    | Carga los datos iniciales.                   |

---

## 📁 Estructura general

```text
maracumango/
├── api/                # Entrada de la API para Vercel
├── public/             # Recursos públicos
├── server/             # Backend, rutas, servicios y migraciones
├── src/                # Aplicación frontend
│   ├── components/     # Componentes de la interfaz
│   ├── context/        # Contextos de la aplicación
│   ├── pages/          # Páginas principales
│   ├── services/       # Servicios del frontend
│   └── types/          # Tipos de TypeScript
├── .env.example        # Plantilla de variables de entorno
├── .gitignore          # Archivos excluidos de Git
├── package.json        # Dependencias y scripts
├── vercel.json         # Configuración de Vercel
└── vite.config.ts      # Configuración de Vite
```

---

## 📄 Licencia

Proyecto desarrollado para **Maracumango Neiva**.

Todos los derechos reservados.
