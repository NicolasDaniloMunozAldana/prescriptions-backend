# Decisiones Técnicas — Backend

Este documento detalla las decisiones de diseño y arquitectura tomadas durante el desarrollo del backend del sistema de gestión de prescripciones médicas.

---

## 1. Framework: NestJS

**Decisión:** NestJS como framework principal sobre Express puro o Fastify standalone.

**Razones:**

- **Arquitectura modular**: cada dominio (auth, users, prescriptions…) vive en su propio módulo con controlador, servicio e inyección de dependencias. Escala limpiamente.
- **Decoradores declarativos**: `@Controller`, `@Get`, `@Body`, `@UseGuards`, `@Roles` hacen el código autodocumentado.
- **Integración nativa con Swagger**: `@nestjs/swagger` genera la documentación OpenAPI leyendo los decoradores, sin escribir YAML manualmente.
- **Ecosistema**: `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/throttler`, `@nestjs/config` resuelven los cross-cutting concerns con una API uniforme.

---

## 2. Autenticación: JWT en cookies `httpOnly` + dual-token

**Decisión:** En lugar de Bearer tokens en `Authorization`, los JWTs se almacenan en cookies `httpOnly`.

**Problema con Bearer tokens en el navegador:**

- El token debe almacenarse en `localStorage` o `sessionStorage`, ambos accesibles desde JavaScript → vector de ataque XSS.

**Ventajas de `httpOnly` cookies:**

| Aspecto | Detalle |
|---|---|
| XSS | La cookie nunca es accesible desde `document.cookie` ni ningún script |
| CSRF | Mitigado con `SameSite: lax` (el navegador no adjunta la cookie en requests cross-site con método cambiado) |
| Persistencia | Persiste entre sesiones sin código extra en el cliente |
| Transparencia | El frontend no necesita leer ni escribir tokens; los gestiona el servidor |

**Dual-token (Access + Refresh):**

```
Access token:  15 min  →  enviado en cada request autenticado
Refresh token: 7 días  →  usado únicamente para rotar el access token
```

Los refresh tokens se persisten en la tabla `RefreshToken` de la base de datos, lo que permite **revocación individual** (logout desde un dispositivo específico sin invalidar otras sesiones).

**Librerías:**
- `@nestjs/jwt` — firma y verificación de tokens
- `@nestjs/passport` + `passport-jwt` — estrategia JWT para NestJS
- `bcrypt` — hash de contraseñas (10 salt rounds)

---

## 3. Control de acceso basado en roles (RBAC)

**Decisión:** Tres roles fijos (`admin`, `doctor`, `patient`) aplicados mediante guards y decoradores personalizados.

**Implementación:**

```typescript
// Decorador que define qué roles pueden acceder
@Roles(Role.admin, Role.doctor)

// Guard que verifica el JWT y extrae al usuario
@UseGuards(JwtAuthGuard, RolesGuard)
```

**Decoradores propios:**
- `@Public()` — marca endpoints que no requieren autenticación (login, register, refresh)
- `@Roles(...roles)` — restringe el endpoint a uno o más roles
- `@CurrentUser()` — inyecta el usuario autenticado en el parámetro del handler

**Jerarquía de permisos:**

| Rol | Capacidades |
|---|---|
| `admin` | Métricas globales, gestión de usuarios, listados sin restricción |
| `doctor` | Crear prescripciones, listar sus pacientes, ver todas las prescripciones |
| `patient` | Ver sus propias prescripciones, consumirlas, descargar PDF |

---

## 4. ORM: Prisma con adaptador `pg`

**Decisión:** Prisma ORM en lugar de TypeORM o Sequelize.

**Razones:**

- **Type-safety real**: el cliente generado a partir del schema convierte cada query en un tipo TypeScript exacto. Un cambio en el schema rompe en compilación, no en runtime.
- **Migraciones declarativas**: el schema es la fuente de verdad; `prisma migrate dev` genera el SQL automáticamente.
- **`@prisma/adapter-pg`**: permite usar un `pg.Pool` compartido, controlando la concurrencia de conexiones y reutilizando el pool existente en lugar de crear una conexión por instancia de Prisma.
- **Prisma Studio**: interfaz visual para explorar y depurar datos durante el desarrollo sin herramientas externas.

**Diseño del schema — decisiones clave:**

- `Doctor` y `Patient` son modelos separados con `userId` único (`@unique`), implementando una relación uno-a-uno opcional desde `User`. Esto evita la circularidad y hace que `User` sea agnóstico del rol a nivel de relaciones.
- `onDelete: Cascade` en `Doctor → User` y `Patient → User` garantiza integridad referencial: eliminar un usuario elimina en cascada su perfil y sus tokens.
- Índices compuestos `@@index([patientId, status])` y `@@index([authorId, status])` en `Prescription` optimizan los filtros más frecuentes (prescripciones de un paciente por estado, de un doctor por estado).

---

## 5. Generación de PDF: PDFKit

**Decisión:** Generar PDFs en el servidor con PDFKit en lugar de librerías client-side.

**Razones:**

- **Seguridad**: el PDF se construye con los datos del servidor. No hay forma de que el cliente manipule el contenido.
- **Streaming**: PDFKit escribe directamente en el response stream, sin cargar el documento completo en memoria.
- **Control total**: diseño del documento (layout, tipografía, márgenes) definido en código TypeScript, sin templates externos.

---

## 6. Paginación offset-based

**Decisión:** Paginación clásica `page` + `limit` con metadata completa para todos los listados.

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Por qué offset y no cursor:**
- Los listados del MVP no requieren scroll infinito ni feeds en tiempo real.
- La paginación por offset es más intuitiva para interfaces de tabla con número de páginas visible.
- Facilita la implementación del filtro de métricas (contar totales es directo con `prisma.model.count`).

---

## 7. Validación de datos: class-validator + ValidationPipe global

**Decisión:** DTOs con decoradores de validación y `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`.

**Efecto:**
- `whitelist` — elimina silenciosamente propiedades no declaradas en el DTO antes de que lleguen al handler.
- `forbidNonWhitelisted` — lanza un `400 Bad Request` si el cliente envía propiedades extra, evitando inyección de campos inesperados.
- `transform: true` — convierte automáticamente strings de query params a los tipos declarados (`number`, `boolean`…).

---

## 8. Seguridad

| Medida | Herramienta | Detalle |
|---|---|---|
| Headers HTTP seguros | `helmet` | Aplicado en todas las rutas excepto `/docs` |
| Rate limiting | `@nestjs/throttler` | 100 req / 60 s por IP |
| CORS restrictivo | `enableCors` | Solo acepta el origen configurado en `APP_ORIGIN` |
| Hash de contraseñas | `bcrypt` | 10 salt rounds |
| Cookies seguras | `httpOnly; SameSite=lax; Secure` (prod) | Tokens inaccesibles desde JS |
| Validación de entrada | `class-validator` | Whitelist + forbidNonWhitelisted en todos los DTOs |
| Secrets configurables | Variables de entorno | JWT secrets externalizados, nunca hardcodeados |

---

## 9. Documentación API: Swagger

**Decisión:** `@nestjs/swagger` para generar la especificación OpenAPI directamente desde los decoradores del código.

**Ventajas:**
- La documentación está siempre sincronizada con el código: si cambia el DTO, cambia la documentación.
- Interfaz interactiva en `/docs` para probar los endpoints sin Postman durante el desarrollo.
- Los ejemplos de request y response se definen con `@ApiProperty({ example: … })`.

---

## 10. Testing

**Unitarios (Jest):**
- `AuthService`: cobertura de login, registro, refresh y logout.
- `PrescriptionsService`: listar, crear, consumir.
- `UsersService`: CRUD con validación de unicidad.

**E2E (Supertest):**
- Flujo completo de autenticación: register → login → profile → refresh → logout.
- Aislamiento: cada test suite crea su propio módulo NestJS con una base de datos de test.

**Configuración:**
- `ts-jest` para ejecutar TypeScript directamente sin compilar.
- `moduleNameMapper` para resolver alias `@/` de `tsconfig.json`.
