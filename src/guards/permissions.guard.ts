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

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const isAdmin =
      user.role === UserType.ADMIN ||
      user.role === 'Admin' ||
      user.role === 'admin';

    if (isAdmin && (user.permissions === undefined || user.permissions === null)) {
      return true;
    }

    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException();
    }

    return true;
  }
}
