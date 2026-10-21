import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { UserType } from '../enums/enums';

function getActionSuffix(method: string): string {
  switch (method?.toUpperCase()) {
    case 'POST':
      return ':create';
    case 'PATCH':
    case 'PUT':
      return ':update';
    case 'DELETE':
      return ':delete';
    default:
      return '';
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // GET, HEAD, OPTIONS istekleri için permission kontrolüne gerek yok (kullanıcı isteği: get için lazım değil)
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint veya Controller'da permission kısıtlaması yoksa izin ver
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('common.unauthorized');
    }

    let userPermissions: string[] = [];
    if (Array.isArray(user.permissions)) {
      userPermissions = user.permissions;
    } else if (typeof user.permissions === 'string') {
      try {
        userPermissions = JSON.parse(user.permissions);
      } catch {
        userPermissions = [];
      }
    }

    // Sadece wildcard (*) yetkisi varsa tüm kısıtlamaları aşar
    // Admin veya User fark etmez; herkes sadece izin listesinde olanları yapabilir!
    if (userPermissions.includes('*')) {
      return true;
    }

    const suffix = getActionSuffix(method);

    // Örneğin '/employee' tanımlandıysa: POST -> '/employee:create', PATCH -> '/employee:update'
    const expectedPermissions = requiredPermissions.map((perm) =>
      perm.includes(':') ? perm.trim() : `${perm.trim()}${suffix}`,
    );

    const hasPermission = expectedPermissions.some((expected) =>
      userPermissions.some((up) => String(up).trim() === expected),
    );

    if (!hasPermission) {
      // AllExceptionsFilter bu anahtarı platform diline (tk, ru, en) göre otomatik çevirir
      throw new ForbiddenException('common.forbidden');
    }

    return true;
  }
}
