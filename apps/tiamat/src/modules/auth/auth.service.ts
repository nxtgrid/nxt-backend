import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Account } from '@core/modules/accounts/entities/account.entity';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) { }

  async generateAccessToken(account: Account) {
    const payload = { username: account.email, sub: String(account.id) };
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      access_token: this.jwtService.sign({
        username: account.email,
        sub: String(account.id),
      }),
      refresh_token: refresh_token,
    };
  }
}
