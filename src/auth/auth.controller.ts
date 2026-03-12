import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser, RequestUserWithRefresh } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Registrar nuevo usuario', description: 'Crea un usuario con rol patient por defecto (o el indicado) y retorna un par de tokens. Para role=doctor puede incluir `specialty`; para role=patient puede incluir `birthDate`.' })
  @ApiCreatedResponse({ description: 'Usuario creado. Retorna accessToken y refreshToken.' })
  @ApiConflictResponse({ description: 'El email ya está registrado.' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Iniciar sesión', description: 'Autentica con email y contraseña. Retorna `accessToken` (15 min) y `refreshToken` (7 días).' })
  @ApiOkResponse({ description: 'Login exitoso. Retorna accessToken y refreshToken.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Renovar access token', description: 'Envía el **refreshToken** como `Authorization: Bearer <token>`. Invalida el token anterior (rotación) y retorna un nuevo par.' })
  @ApiOkResponse({ description: 'Token renovado. Retorna nuevo accessToken y refreshToken.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido o expirado.' })
  @ApiBearerAuth('access-token')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: RequestUserWithRefresh) {
    return this.authService.refreshTokens(user.userId, user.refreshToken);
  }

  @ApiOperation({ summary: 'Cerrar sesión', description: 'Si se envía `refreshToken` en el body, revoca solo esa sesión. Sin body, revoca todas las sesiones del usuario.' })
  @ApiOkResponse({ description: 'Sesión(es) cerrada(s) correctamente.' })
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string', description: 'Token de refresco a revocar. Si se omite, se revocan todas las sesiones.' } } }, required: false })
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser() user: RequestUser,
    @Body('refreshToken') refreshToken?: string,
  ) {
    if (refreshToken) {
      return this.authService.logout(user.userId, refreshToken);
    }
    return this.authService.logoutAll(user.userId);
  }

  @ApiOperation({ summary: 'Perfil del usuario autenticado', description: 'Retorna el usuario actual con su rol y perfil vinculado (doctor o patient si aplica).' })
  @ApiOkResponse({ description: 'Perfil del usuario autenticado.' })
  @ApiBearerAuth('access-token')
  @Get('profile')
  profile(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.userId);
  }
}
