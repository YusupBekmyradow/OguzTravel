import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, SKIP_PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
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

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipped) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

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

    if (userPermissions.includes('*')) {
      return true;
    }

    const suffix = getActionSuffix(method);

    const expectedPermissions = requiredPermissions.map((perm) =>
      perm.includes(':') ? perm.trim() : `${perm.trim()}${suffix}`,
    );

    const hasPermission = expectedPermissions.some((expected) =>
      userPermissions.some((up) => String(up).trim() === expected),
    );

    if (!hasPermission) {
      throw new ForbiddenException('common.forbidden');
    }

    return true;
  }
}
