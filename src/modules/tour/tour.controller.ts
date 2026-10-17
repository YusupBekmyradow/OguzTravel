import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Tour')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('tour')
export class TourController {
  constructor(private readonly tourService: TourService) { }

  @Post('/add-tour')
  async create(@Body() createDto: CreateTourDto, @I18nLang() lang: string) {
    return this.tourService.addTour(createDto, lang);
  }

  @Get('/get-tours')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('is_paid') is_paid?: number,
    @Query('system') system?: string,
    @I18nLang() lang: string = 'tk',) {
    return this.tourService.getAllTour(
      page,
      limit,
      search,
      start_date,
      end_date,
      opr_guid,
      prepared_opr_guid,
      is_paid,
      system,
      lang,
    );
  }


  @Patch('/update-tour')
  async update(@Body() updateDto: UpdateTourDto, @I18nLang() lang: string) {
    return this.tourService.updateTour(updateDto, lang);
  }

  @Delete('/delete-tour')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.tourService.deleteTour(guid, lang);
  }
}

