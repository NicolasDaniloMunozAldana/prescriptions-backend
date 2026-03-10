import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser, RequestUserWithRefresh } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   * Accessible without authentication.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Login with email + password.
   * Returns accessToken + refreshToken.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Rotate refresh token.
   * Send current refreshToken as: Authorization: Bearer <token>
   * Returns new accessToken + refreshToken. Old token is invalidated.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: RequestUserWithRefresh) {
    return this.authService.refreshTokens(user.userId, user.refreshToken);
  }

  /**
   * Logout. Optionally pass { refreshToken } in body to revoke a specific
   * device session; omit it to revoke all sessions.
   */
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

  /**
   * Return current user profile (role + linked doctor/patient ids).
   */
  @Get('profile')
  profile(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.userId);
  }
}
