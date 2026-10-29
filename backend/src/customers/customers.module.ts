import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerSession } from './entities/customer-session.entity';
import { Customer } from './entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerSession])],
  exports: [TypeOrmModule],
})
export class CustomersModule {}
