import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TotalCalculationsService } from './total_calculations.service';
import { CreateTotalCalculationDto } from './dto/create-total_calculation.dto';
import { UpdateTotalCalculationDto } from './dto/update-total_calculation.dto';
import { ImportTotalCalculationsDto } from './dto/import-total_calculations.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Total Calculations')
// Login required (financial data). A page permission (e.g. '/finance/cash-flow')
// can be added once users are assigned it — the dashboard reads this too.
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
// @RequirePermissions('/finance/cash-flow')
@Controller('total-calculations')
export class TotalCalculationsController {
  constructor(private readonly totalCalculationsService: TotalCalculationsService) { }

  @Post('/add-total-calculation')
  async create(
    @Body() createDto: CreateTotalCalculationDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.totalCalculationsService.addTotalCalculation(createDto, lang);
  }


  // Bulk import of kassa-book (Excel) rows. Rows whose import_key already
  // exists are skipped, so re-uploading the same file is safe.
  @Post('/import-total-calculations')
  async importRows(
    @Body() importDto: ImportTotalCalculationsDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.totalCalculationsService.importTotalCalculations(importDto.rows, lang);
  }


  @Get('/get-all-total-calculations')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('category_guid') category_guid?: string,
    @Query('datetime') datetime?: string,
    @Query('receiver_opr_guid') receiver_opr_guid?: string,
    @Query('office_guid') office_guid?: string,
    @Query('status') status?: string,
    @Query('currency') currency?: string,
    @Query('is_manual') is_manual?: boolean,
    @Query('source') source?: string,
    @Query('type') type?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = {
      search,
      category_guid,
      datetime,
      receiver_opr_guid,
      office_guid,
      status,
      currency,
      is_manual: is_manual !== undefined ? String(is_manual) === 'true' : undefined,
      source,
      type,
      date_from,
      date_to,
    };
    return this.totalCalculationsService.getAllTotalCalculations(
      Number(page),
      Number(limit),
      filters,
      lang,
    );
  }


  @Patch('/update-total-calculation')
  async update(
    @Body() updateDto: UpdateTotalCalculationDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.totalCalculationsService.updateTotalCalculation(updateDto, lang);
  }


  @Delete('/delete-total-calculation')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.totalCalculationsService.deleteTotalCalculation(guid, lang);
  }
}
