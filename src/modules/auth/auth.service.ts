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

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User) private userModel: typeof User,
    private jwtService: JwtService,
  ) { }

  // async signUp(signUpAuthDto: SignUpAuthDto) {
  //   try {

  //     const existUser = await this.userModel.findOne({ where: { phone_number: signUpAuthDto.phone_number } });

  //     if (existUser) return errorResponse(HttpStatuses.FORBIDDEN, 'user already exist');

  //     const salt = await bcrypt.genSalt(10);
  //     const hashedPassword = await bcrypt.hash(signUpAuthDto.password, salt);

  //     const preparedUserInfo = { ...signUpAuthDto, password: hashedPassword };

  //     const newUser = await this.userModel.create(preparedUserInfo as User);

  //     return successResponse(HttpStatuses.CREATED, newUser, 'user creation success');

  //   } catch (error: any) {
  //     errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'user creation failed');
  //   }
  // }

  async signIn(signInAuthDto: signInAuthDto) {
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

      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, 'user not found');

      const comparePassword = await bcrypt.compare(signInAuthDto.password, existUser.password);
      if (!comparePassword) return errorResponse(HttpStatuses.FORBIDDEN, 'password invalid');

      const payload = { phone: existUser.phone_number, guid: existUser.guid, role: existUser.role };

      const access_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
      const refresh_token = await this.jwtService.signAsync(payload, { expiresIn: '30d' });

      await existUser.update({ refresh_token });

      const responseData = {
        access_token,
        refresh_token,
        user: {
          guid: existUser.guid,
          phone_number: existUser.phone_number,
          role: existUser.role,
          permissions: existUser.permissions,
          employee_name: existUser.employee ? existUser.employee.fullName : null,
          position_guid: existUser.employee ? existUser.employee.position_guid : null
        }
      };
      return successResponse(HttpStatuses.OK, { responseData }, 'sign in success');

    } catch (error: any) {
      console.log(error);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'signin failed')
    }
  }


  async logOut(user_guid: string) {
    try {

      const existUser = await this.userModel.findOne({ where: { guid: user_guid } });
      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, 'user not found');

      await existUser.update({ refresh_token: '' });

      return successResponse(HttpStatuses.OK, '', 'user logout success')

    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'user logout failed');
    }
  }


  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {

      const { refreshToken } = refreshTokenDto;

      const payload = await this.jwtService.verifyAsync(refreshToken);

      const existUser = await this.userModel.findOne({ where: { guid: payload.guid } });
      if (!existUser) return errorResponse(HttpStatuses.NOT_FOUND, 'user not found');

      if (existUser.refresh_token !== refreshToken) {
        return errorResponse(HttpStatuses.FORBIDDEN, 'invalid refresh token');
      }

      const newPayload = { phone: existUser.phone_number, guid: existUser.guid, role: existUser.role };

      const access_token = await this.jwtService.signAsync(newPayload, { expiresIn: '7d' });
      const new_refresh_token = await this.jwtService.signAsync(newPayload, { expiresIn: '30d' });

      await existUser.update({ refresh_token: new_refresh_token });

      return successResponse(HttpStatuses.OK, { access_token, refresh_token: new_refresh_token }, 'token refresh success');
    } catch (error: any) {
      return errorResponse(HttpStatuses.UNAUTHORIZED, 'refresh token expired or invalid');
    }
  }

}
