import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Transfer')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) { }

  @Post('/add-transfer')
  async create(
    @Body() createDto: CreateTransferDto,
    @I18nLang() lang: string,
  ) {
    return this.transferService.addTransfer(createDto, lang);
  }

  @Get('/get-transfers')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('transfer_type') transfer_type?: string,
    @Query('machine_type') machine_type?: string,
    @Query('is_paid') is_paid?: number,
    @Query('system') system?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.transferService.getAllTransfer(
      page,
      limit,
      search,
      start_date,
      end_date,
      opr_guid,
      prepared_opr_guid,
      transfer_type,
      machine_type,
      is_paid,
      system,
      lang,
    );
  }

  @Patch('/update-transfer')
  async update(
    @Body() updateDto: UpdateTransferDto,
    @I18nLang() lang: string,
  ) {
    return this.transferService.updateTransfer(updateDto, lang);
  }

  @Delete('/delete-transfer')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.transferService.deleteTransfer(guid, lang);
  }
}