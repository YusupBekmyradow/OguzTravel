import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../user/entities/user.entity';
import { SignUpAuthDto } from './dto/signup-auth.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { signInAuthDto } from './dto/signin-auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Employee } from '../employee/entities/employee.entity';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User) private userModel: typeof User,
    private jwtService: JwtService,
    private readonly i18n: I18nService,
  ) { }

  async signIn(signInAuthDto: signInAuthDto, lang: string) {
    try {

      const existUser = await this.userModel.findOne({
        where: { phone_number: signInAuthDto.phone_number },
        include: [
          {
            model: Employee,
            attributes: ['fullName', 'position_guid']
          }
        ]
      });

      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('auth.userNotFound', { lang }));

      const comparePassword = await bcrypt.compare(signInAuthDto.password, existUser.password ?? '');
      if (!comparePassword) return errorResponse(HttpStatuses.FORBIDDEN, this.i18n.t('auth.loginFailed', { lang }));

      const payload = {
        phone_number: existUser.phone_number,
        guid: existUser.guid,
        role: existUser.role,
        permissions: existUser.permissions || []
      };

      const access_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
      const refresh_token = await this.jwtService.signAsync(payload, { expiresIn: '30d' });

      await existUser.update({ refresh_token });

      return successResponse(HttpStatuses.OK, {
        guid: existUser.guid,
        phone_number: existUser.phone_number,
        role: existUser.role,
        permissions: existUser.permissions || [],
        employee_name: existUser.employee ? existUser.employee.fullName : null,
        position_guid: existUser.employee ? existUser.employee.position_guid : null,
        access_token,
        refresh_token,
      }, this.i18n.t('auth.loginSuccess', { lang }));

    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('auth.loginFailed', { lang }));
    }
  }



  async logOut(user_guid: string, lang: string) {
    try {

      const existUser = await this.userModel.findOne({ where: { guid: user_guid } });
      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('auth.userNotFound', { lang }));

      await existUser.update({ refresh_token: '' });

      return successResponse(HttpStatuses.OK, '', this.i18n.t('auth.logoutSuccess', { lang }));

    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('auth.logoutFailed', { lang }));
    }
  }


  async refreshToken(refreshTokenDto: RefreshTokenDto, lang: string) {
    try {

      const { refreshToken } = refreshTokenDto;

      const payload = await this.jwtService.verifyAsync(refreshToken);

      const existUser = await this.userModel.findOne({ where: { guid: payload.guid } });
      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('auth.userNotFound', { lang }));

      if (existUser.refresh_token !== refreshToken) {
        return errorResponse(HttpStatuses.FORBIDDEN, this.i18n.t('auth.tokenRefreshFailed', { lang }));
      }

      const newPayload = {
        phone_number: existUser.phone_number,
        guid: existUser.guid,
        role: existUser.role,
        permissions: existUser.permissions || []
      };

      const access_token = await this.jwtService.signAsync(newPayload, { expiresIn: '7d' });
      const new_refresh_token = await this.jwtService.signAsync(newPayload, { expiresIn: '30d' });

      await existUser.update({ refresh_token: new_refresh_token });

      return successResponse(HttpStatuses.OK, {
        access_token,
        refresh_token: new_refresh_token,
        permissions: existUser.permissions || [],
      }, this.i18n.t('auth.tokenRefreshed', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.UNAUTHORIZED, this.i18n.t('auth.tokenRefreshFailed', { lang }));
    }
  }



  async getMe(user_guid: string, lang: string) {
    try {
      const existUser = await this.userModel.findOne({
        where: { guid: user_guid },
        include: [
          {
            model: Employee,
            attributes: ['fullName', 'position_guid']
          }
        ]
      });

      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('auth.userNotFound', { lang }));

      return successResponse(HttpStatuses.OK, {
        guid: existUser.guid,
        phone_number: existUser.phone_number,
        role: existUser.role,
        permissions: existUser.permissions || [],
        employee_name: existUser.employee ? existUser.employee.fullName : null,
        position_guid: existUser.employee ? existUser.employee.position_guid : null,
      }, this.i18n.t('auth.loginSuccess', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('auth.loginFailed', { lang }));
    }
  }

}
