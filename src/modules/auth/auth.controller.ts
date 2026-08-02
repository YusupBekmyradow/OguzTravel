import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpAuthDto } from './dto/signup-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminRoleGuard } from '../../guards/admin.guard';
import { signInAuthDto } from './dto/signin-auth.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // /* @UseGuards(JwtAuthGuard, AdminRoleGuard)
  // @ApiBearerAuth('bearerAuth') */
  // @Post('/signup')
  // async signUp(@Body() signUpAuthDto: SignUpAuthDto) {
  //   return this.authService.signUp(signUpAuthDto);
  // }

  @Post('/signin')
  async signIn(@Body() signInAuthDto: signInAuthDto) {
    return this.authService.signIn(signInAuthDto)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/me')
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.guid);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('/logout')
  async logOut(@Req() req: any) {
    return this.authService.logOut(req.user.guid)
  }

  @Post('/refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto)
  }

}
