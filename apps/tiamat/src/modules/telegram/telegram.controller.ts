import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { TelegramService } from './telegram.service';

@UseGuards(AuthenticationGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) { }

  @Post('link')
  linkAccount(@Body() { telegram_id, telegram_link_token }: { telegram_id: string, telegram_link_token: string }) {
    return this.telegramService.link(telegram_id, telegram_link_token);
  }

  @Get('accounts/:telegram_id')
  getAccountByTelegramId(@Param('telegram_id') telegramId: string) {
    return this.telegramService.findAccountByTelegramId(telegramId);
  }
}
