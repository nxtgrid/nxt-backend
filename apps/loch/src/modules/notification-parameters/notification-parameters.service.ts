import { Injectable } from '@nestjs/common';
import { NotificationParametersService as CoreNotificationParametersService } from '@core/modules/notification-parameters/notification-parameters.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationParameter } from '@core/modules/notification-parameters/entities/notification-parameter.entity';
import { CreateNotificationParameterInput } from '@core/modules/notification-parameters/dto/create-notification-parameter.input';
import { UpdateNotificationParameterInput } from '@core/modules/notification-parameters/dto/update-notification-parameter.input';

@Injectable()
export class NotificationParametersService extends CoreNotificationParametersService {
  constructor(
    @InjectRepository(NotificationParameter)
    protected readonly notificationParametersRepository: Repository<NotificationParameter>,
  ) {
    super(notificationParametersRepository);
  }

  create(createNotificationParameterInput: CreateNotificationParameterInput) {
    return this.notificationParametersRepository.save(createNotificationParameterInput);
  }

  async update(id: number, updateNotificationParameterInput: UpdateNotificationParameterInput) {
    await this.notificationParametersRepository.update(id, updateNotificationParameterInput);
    return this.findOne(id);
  }
}
