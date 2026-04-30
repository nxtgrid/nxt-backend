import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@core/modules/supabase.module';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private cachedKeys: Set<string> | null = null;
  private cachedAt = 0;

  constructor(private readonly supabaseService: SupabaseService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) throw new UnauthorizedException('Missing or malformed Authorization header');

    const validKeys = await this.getValidKeys();
    if (!validKeys.has(token)) throw new UnauthorizedException('Invalid API key');

    return true;
  }

  private async getValidKeys(): Promise<Set<string>> {
    if (this.cachedKeys && Date.now() - this.cachedAt < CACHE_TTL_MS) {
      return this.cachedKeys;
    }

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const keys = await supabase
      .from('api_keys')
      .select('key')
      .eq('is_locked', false)
      .then(handleResponse);

    if (!keys) {
      if (this.cachedKeys) return this.cachedKeys;
      throw new UnauthorizedException('Unable to verify API key');
    }

    this.cachedKeys = new Set(keys.map(({ key }) => key));
    this.cachedAt = Date.now();

    return this.cachedKeys;
  }
}
