import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectModel(User) private userModel: typeof User,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('ACCESS_TOKEN_SECRET') || 'hsdfkjhsdjkfhskdjsdkfsdfsfd',
        });
    }

    async validate(payload: any) {
        // İzinleri token'dan değil doğrudan veritabanından alıyoruz
        // Böylece yetki değiştiğinde çıkış-giriş yapmaya gerek kalmadan ANINDA geçerli olur!
        const dbUser = await this.userModel.findByPk(payload.guid, {
            attributes: ['guid', 'phone_number', 'role', 'permissions', 'isActive'],
        });

        if (!dbUser || dbUser.isActive === false) {
            throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif durumda.');
        }

        return {
            phone_number: dbUser.phone_number,
            guid: dbUser.guid,
            role: dbUser.role,
            permissions: dbUser.permissions || [],
        };
    }
}