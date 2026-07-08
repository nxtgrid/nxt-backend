import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';

import { ApiCreateOrderDto } from './dto/create-order.dto';
import { InitialiseFlutterwaveOrderDto, InitialisePublicFlutterwaveOrderDto } from './dto/initialise-flutterwave-order.dto';
import { VerifyFlutterwaveOrderDto } from './dto/verify-flutterwave-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(protected readonly service: OrdersService) { }

  @UseGuards(AuthenticationGuard)
  @Post()
  async createOrder(
    @CurrentUser() user: NxtSupabaseUser,
    @Body() body: ApiCreateOrderDto): Promise<{ id: number; }> {
    // @TODO :: Put extra checks to make sure that if sender is a member belonging to a developer,
    // then they can only send money from the wallet of their organization

    // @TODO :: Agents can only send from their own wallet
    // if(account.agent && account.agent.id !== body.sender_wallet.agent.id)
    //   throw new UnauthorizedException('Trying to send money with the wrong agent id');

    return this.service.create(body, user);
  }

  // Called from Ayrton frontend
  @UseGuards(AuthenticationGuard)
  @Post('flutterwave/initialise')
  initialiseOrder(
    @CurrentUser() user: NxtSupabaseUser,
    @Body() body: InitialiseFlutterwaveOrderDto,
  ): Promise<any> {
    return this.service.initialisePrivate(body, user);
  }

  // Called from Niffler to create orders from public view
  @Post('flutterwave/initialise/public')
  initialisePublicOrder(@Body() body: InitialisePublicFlutterwaveOrderDto): Promise<any> {
    return this.service.initialisePublic(body);
  }

  @Post('flutterwave/check/public')
  checkOrderPublic(@Body() body: VerifyFlutterwaveOrderDto) {
    return this.service.getOrderDetailsPublic(body);
  }

  @Post('flutterwave/cancel/public')
  cancelOrderPublic(@Body() body: VerifyFlutterwaveOrderDto) {
    return this.service.cancelOrderPublic(body);
  }

  @UseGuards(AuthenticationGuard)
  @Post('flutterwave/verify')
  verifyOrder(@Body() body: VerifyFlutterwaveOrderDto) {
    return this.service.verifyFlutterwaveOrder(body);
  }
}
