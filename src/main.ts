import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers ───────────────────────────────────────────────────────
  // Helmet is disabled on the /docs path so Swagger UI assets load correctly
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/docs')) return next();
    helmet()(req, res, next);
  });

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.APP_ORIGIN ?? '*',
    credentials: true,
  });

  // ── Global API prefix ─────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation & transform ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Prescriptions API')
    .setDescription(
      `## Sistema de Prescripciones Médicas

API REST para la gestión de prescripciones médicas con tres roles:
**Admin**, **Médico** y **Paciente**.

### Autenticación
Todas las rutas (excepto \`/auth/login\`, \`/auth/register\` y \`/auth/refresh\`) requieren
un JWT de acceso válido. Incluye el token en la cabecera:

\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Obtén el token haciendo **POST /api/auth/login**. El access token expira en 15 minutos;
usa **POST /api/auth/refresh** con el refresh token para renovarlo.

### Roles
| Rol | Acceso |
|-----|--------|
| \`admin\` | Métricas, listados globales, gestión de usuarios |
| \`doctor\` | Crear y ver sus propias prescripciones |
| \`patient\` | Ver, consumir y descargar PDF de sus prescripciones |

### Códigos de error
| Código | Significado |
|--------|-------------|
| 400 | Validación fallida — revisa el campo \`message\` |
| 401 | Token ausente, expirado o inválido |
| 403 | Rol insuficiente para la operación |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej. email ya registrado, prescripción ya consumida) |
| 429 | Rate limit excedido (100 req / 60 s) |
| 500 | Error interno del servidor |

### Cuentas de prueba (seed)
| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@test.com | admin123 | admin |
| dr@test.com | dr123 | doctor |
| patient@test.com | patient123 | patient |`,
    )
    .setVersion('1.0')
    .setContact(
      'Equipo de Desarrollo',
      'https://github.com',
      'dev@prescriptions.io',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Access token JWT. Obtenlo en POST /api/auth/login',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Registro, login, refresco de token y perfil del usuario autenticado')
    .addTag('Users', 'Gestión de usuarios (solo Admin)')
    .addTag('Doctors', 'Listado de médicos (solo Admin)')
    .addTag('Patients', 'Listado de pacientes (solo Admin)')
    .addTag('Prescriptions', 'Creación y consulta de prescripciones (Médico y Paciente)')
    .addTag('Admin', 'Listados globales y métricas del sistema (solo Admin)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,     // conserva el token al recargar
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'Prescriptions API — Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
