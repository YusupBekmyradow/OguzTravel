import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { CafeteriaService } from './cafeteria.service';
import { CreateCafeteriaDto } from './dto/create-cafeteria.dto';
import { UpdateCafeteriaDto } from './dto/update-cafeteria.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { I18nLang } from 'nestjs-i18n';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Cafeteria')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/cafeteria')
@Controller('cafeteria')
export class CafeteriaController {
  constructor(private readonly cafeteriaService: CafeteriaService) { }

  @Post('/add-cafeteria')
  async create(
    @Body() dto: CreateCafeteriaDto,
    @Req() req: any,
    @I18nLang() lang: string) {
    return this.cafeteriaService.addCafeteria(dto, req?.user, lang);
  }


  @Get('/get-all-cafeteria')
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('type') type?: boolean | string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.cafeteriaService.getAllCafeteria(
      Number(page),
      Number(limit),
      { search, start_date, end_date, type },
      lang,
    );
  }


  @Get('/get-cafeteria-summary')
  async getSummary(
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('type') type?: boolean | string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.cafeteriaService.getSummary({ search, start_date, end_date, type }, lang);
  }


  @Patch('/update-cafeteria')
  async update(
    @Body() dto: UpdateCafeteriaDto,
    @I18nLang() lang: string) {
    return this.cafeteriaService.updateCafeteria(dto, lang);
  }


  @Delete('/delete-cafeteria')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.cafeteriaService.deleteCafeteria(guid, lang);
  }
}
