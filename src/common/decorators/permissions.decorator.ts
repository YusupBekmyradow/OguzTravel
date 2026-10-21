import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const SKIP_PERMISSIONS_KEY = 'skip_permissions';

export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const SkipPermissions = () => SetMetadata(SKIP_PERMISSIONS_KEY, true);
