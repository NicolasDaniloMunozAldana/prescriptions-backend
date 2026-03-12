# Prescriptions API — Backend

Sistema de gestión de prescripciones médicas. API REST construida con **NestJS** que expone los recursos de autenticación, usuarios, doctores, pacientes y prescripciones con control de acceso basado en roles (RBAC).

Desarrollado con ♥ por Nicolás para Nutrabiotics.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 11 |
| Lenguaje | TypeScript 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Base de datos | PostgreSQL 14+ |
| Autenticación | JWT dual-token (access + refresh) en cookies `httpOnly` |
| PDF | PDFKit 0.17 |
| Validación | class-validator + class-transformer |
| Documentación | Swagger / OpenAPI (`@nestjs/swagger`) |
| Seguridad | Helmet · `@nestjs/throttler` (100 req/60 s) · bcrypt 6 |
| Testing | Jest 30 · Supertest |

---

## Requisitos previos

- **Node.js 18+**
- **PostgreSQL 14+** instalado y corriendo localmente
- `npm`

---

## Setup local

### 1. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
```

Contenido de `.env`:

```env
DATABASE_URL="postgresql://postgres:<TU_PASSWORD>@localhost:5432/prescriptions?schema=public"

JWT_ACCESS_SECRET="cambia-este-secreto-en-produccion"
JWT_REFRESH_SECRET="cambia-este-otro-secreto-en-produccion"

JWT_ACCESS_TTL="900s"
JWT_REFRESH_TTL="7d"

RUN_SEED = true

APP_ORIGIN="http://localhost:3000"

PORT=4000
```

> ⚠️ Reemplaza `<TU_PASSWORD>` con la contraseña de tu usuario de PostgreSQL.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar migraciones y seed

```bash
# Genera el cliente de Prisma
npx prisma generate

# Aplica las migraciones
npx prisma migrate deploy

# Pobla la base de datos con datos de prueba
npx prisma db seed
```

### 4. Iniciar el servidor

```bash
# Desarrollo (hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

Servidor disponible en: **http://localhost:4000**  
Documentación Swagger: **http://localhost:4000/docs**

---

## Cuentas de prueba

Creadas automáticamente por el seed:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@test.com` | `admin123` |
| Doctor | `dr@test.com` | `dr123` |
| Paciente | `patient@test.com` | `patient123` |

---

## Estructura del proyecto

```
prescriptions-backend/
├── prisma/
│   ├── schema.prisma        # Esquema de la base de datos
│   ├── seed.ts              # Datos de prueba
│   └── migrations/          # Historial de migraciones
└── src/
    ├── main.ts              # Bootstrap: Helmet, CORS, Swagger, ValidationPipe
    ├── app.module.ts        # Módulo raíz (ThrottlerModule, ConfigModule)
    ├── auth/                # Login, registro, refresh, logout · estrategias JWT
    ├── users/               # CRUD de usuarios (admin)
    ├── doctors/             # Listado de doctores y sus pacientes
    ├── patients/            # Listado de pacientes
    ├── prescriptions/       # CRUD de prescripciones + consumo + generación de PDF
    ├── admin/               # Métricas globales del sistema
    ├── prisma/              # PrismaService inyectable
    └── common/              # Guards, decoradores y filtros reutilizables
```

---

## Endpoints principales

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Iniciar sesión |
| POST | `/api/auth/register` | — | Registrar cuenta |
| POST | `/api/auth/refresh` | — | Renovar access token |
| POST | `/api/auth/logout` | Autenticado | Cerrar sesión |
| GET | `/api/auth/profile` | Autenticado | Perfil del usuario actual |
| GET | `/api/users` | `admin` | Listar usuarios |
| POST | `/api/users` | `admin` | Crear usuario |
| DELETE | `/api/users/:id` | `admin` | Eliminar usuario |
| GET | `/api/prescriptions` | `doctor` · `patient` | Listar prescripciones (paginado) |
| POST | `/api/prescriptions` | `doctor` | Crear prescripción |
| PUT | `/api/prescriptions/:id/consume` | `patient` | Marcar como consumida |
| GET | `/api/prescriptions/:id/pdf` | `patient` | Descargar PDF |
| GET | `/api/admin/metrics` | `admin` | Métricas del sistema |

Documentación completa interactiva en `/docs`.

---

## Scripts disponibles

```bash
npm run start:dev      # Desarrollo con hot-reload
npm run start:prod     # Producción (requiere build previo)
npm run build          # Compilar a dist/

npm run test           # Tests unitarios
npm run test:e2e       # Tests end-to-end
npm run test:cov       # Tests con cobertura

npx prisma studio      # UI visual de la base de datos
npx prisma migrate dev # Crear nueva migración
npx prisma db seed     # Ejecutar seed
npx prisma generate    # Regenerar el cliente de Prisma
```

---

## Notas de seguridad

- Los secrets de JWT en `.env.example` son de demostración. **Cámbialos en cualquier entorno real.**
- Rate limiting: 100 req / 60 s por IP (vía `@nestjs/throttler`).
- Contraseñas hasheadas con `bcrypt` (10 salt rounds).
- Tokens JWT en cookies `httpOnly; SameSite=lax` — inaccesibles desde JavaScript.
- `helmet` aplicado en todas las rutas excepto `/docs`.

---

## Puertos

| Servicio | Puerto |
|---|---|
| API NestJS | 4000 |
| PostgreSQL | 5432 |

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
