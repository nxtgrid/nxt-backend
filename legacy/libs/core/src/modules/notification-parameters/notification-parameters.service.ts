import { Injectable } from '@nestjs/common';
import { NotificationParameter } from './entities/notification-parameter.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class NotificationParametersService {
  constructor(
    @InjectRepository(NotificationParameter)
    protected readonly notificationParametersRepository: Repository<NotificationParameter>,
  ) { }

  findAll() {
    return 'This action returns all notificationParameters';
  }

  findOne(id: number) {
    return `This action returns a #${ id } notificationParameter`;
  }
}
