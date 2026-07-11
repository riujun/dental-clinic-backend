// DONE: Idea #8 - endpoints de Lista de espera
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import type { JwtUser } from '../../common/decorators/auth.decorators';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  ChangeWaitlistStatusDto,
  CreateWaitlistEntryDto,
  QueryWaitlistDto,
  QueryWaitlistMatchesDto,
  UpdateWaitlistEntryDto,
} from './dto/waitlist.dtos';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWaitlistEntryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.waitlist.create(tenantId, dto, user?.sub);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryWaitlistDto) {
    return this.waitlist.findAll(tenantId, q);
  }

  /** Idea #8: sugerencias al liberarse un horario (cancelación de cita) */
  @Get('matches')
  findMatches(@TenantId() tenantId: string, @Query() q: QueryWaitlistMatchesDto) {
    return this.waitlist.findMatches(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.waitlist.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWaitlistEntryDto,
  ) {
    return this.waitlist.update(tenantId, id, dto);
  }

  /** waiting → contacted / scheduled / cancelled */
  @Patch(':id/status')
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChangeWaitlistStatusDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.waitlist.changeStatus(tenantId, id, dto, user?.sub);
  }
}
