import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpAuthDto } from './dto/signup-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminRoleGuard } from '../../guards/admin.guard';
import { signInAuthDto } from './dto/signin-auth.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('/signin')
  async signIn(
    @Body() signInAuthDto: signInAuthDto,
    @I18nLang() lang: string,
  ) {
    return this.authService.signIn(signInAuthDto, lang);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/me')
  async getMe(
    @Req() req: any,
    @I18nLang() lang: string,
  ) {
    return this.authService.getMe(req.user.guid, lang);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('/logout')
  async logOut(
    @Req() req: any,
    @I18nLang() lang: string,
  ) {
    return this.authService.logOut(req.user.guid, lang);
  }

  @Post('/refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @I18nLang() lang: string,
  ) {
    return this.authService.refreshToken(refreshTokenDto, lang);
  }

}
