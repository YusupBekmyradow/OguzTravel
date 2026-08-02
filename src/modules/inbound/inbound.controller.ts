import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Inbound')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/intake')
@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) { }

  @Post('/add-inbound')
  async create(@Body() createInboundDto: CreateInboundDto) {
    return this.inboundService.addInbound(createInboundDto);
  }

  @Get('/get-all-inbound')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.inboundService.getAllInbound(Number(page), Number(limit));
  }

  @Patch('/update-inbound')
  update(@Body() updateInboundDto: UpdateInboundDto) {
    return this.inboundService.updateInbound(updateInboundDto);
  }

  @Delete('/delete-inbound')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.inboundService.deleteInbound(guid);
  }
}
