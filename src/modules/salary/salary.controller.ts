import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { SalaryService } from './salary.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { GenerateSalaryMonthDto, LockSalaryMonthDto, MarkSalaryPaidDto } from './dto/salary-actions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
@ApiTags('Salary')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/finance/salary')
@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) { }

  @Post('/add-salary')
  async create(
    @Body() dto: CreateSalaryDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.salaryService.addSalary(dto, req?.user, lang);
  }


  @Get('/get-all-salaries')
  async getAll(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('office_guid') office_guid?: string,
    @Query('employee_guid') employee_guid?: string,
    @Query('include_previous') include_previous?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.salaryService.getAllSalaries(
      req?.user,
      Number(page),
      Number(limit),
      { search, month, office_guid, employee_guid },
      String(include_previous) === 'true',
      lang,
    );
  }


  @Get('/get-employees')
  async getEmployees(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 40,
    @Query('search') search?: string,
    @Query('missing_month') missing_month?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.salaryService.getEmployees(req?.user, Number(page), Number(limit), search, lang, missing_month);
  }


  @Post('/generate-month')
  async generateMonth(
    @Body() dto: GenerateSalaryMonthDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.salaryService.generateMonth(dto, req?.user, lang);
  }


  @Post('/mark-paid')
  async markPaid(
    @Body() dto: MarkSalaryPaidDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.salaryService.markPaid(dto, req?.user, lang);
  }


  @Get('/get-month-status')
  async getMonthStatus(
    @Req() req: any,
    @Query('month') month: string,
    @Query('office_guid') office_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.salaryService.getMonthStatus(req?.user, month, office_guid, lang);
  }


  @Patch('/lock-month')
  async lockMonth(
    @Body() dto: LockSalaryMonthDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.salaryService.lockMonth(dto, req?.user, lang);
  }


  @Get('/get-salary-summary')
  async getSummary(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('office_guid') office_guid?: string,
    @Query('employee_guid') employee_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.salaryService.getSummary(req?.user, { search, month, office_guid, employee_guid }, lang);
  }


  @Patch('/update-salary')
  async update(
    @Body() dto: UpdateSalaryDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.salaryService.updateSalary(dto, req?.user, lang);
  }


  @Delete('/delete-salary')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }
      }
    }
  })
  async remove(
    @Body('guid') guid: string | string[],
    @Req() req: any,
    @I18nLang() lang: string,
  ) {
    return this.salaryService.deleteSalary(guid, req?.user, lang);
  }
}
