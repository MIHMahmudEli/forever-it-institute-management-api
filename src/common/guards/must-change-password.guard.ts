import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ALLOW_MUST_CHANGE_PASSWORD_KEY = 'allowMustChangePassword';
export const AllowMustChangePassword = () => SetMetadata(ALLOW_MUST_CHANGE_PASSWORD_KEY, true);

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_MUST_CHANGE_PASSWORD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAllowed) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (user && user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Password change required before accessing the portal. Please update your temporary password.',
      });
    }

    return true;
  }
}
