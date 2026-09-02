import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../../auth/guards/auth.guard';

// Must run after AuthGuard (e.g. @UseGuards(AuthGuard, AdminGuard)) so
// req.user is already populated from a fresh public.users lookup.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!req.user) {
      throw new UnauthorizedException('Not authenticated.');
    }
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
