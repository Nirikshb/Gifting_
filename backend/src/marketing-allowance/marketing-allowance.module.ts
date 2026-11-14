import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingAllowanceLedger } from './entities/marketing-allowance-ledger.entity';
import { MarketingAllowanceService } from './marketing-allowance.service';

/**
 * Marketing allowance ledger.
 *
 * Not yet wired into AppModule: no consumer (campaign send / dispatcher
 * enforcement) exists yet. Import this module and add it to AppModule when
 * marketing sends are implemented.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MarketingAllowanceLedger])],
  providers: [MarketingAllowanceService],
  exports: [MarketingAllowanceService],
})
export class MarketingAllowanceModule {}
