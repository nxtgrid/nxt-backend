import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class AuthenticationGuard extends AuthGuard([ 'supabase', 'headerapikey' ]) implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  // @TODO-GQL :: Check if we even need this!?
  // getRequest(context: ExecutionContext) {
  //   if (context.getType() === 'http') {
  //     return context.switchToHttp().getRequest<Request>();
  //   }
  // }
}
