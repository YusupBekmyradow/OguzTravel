import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Hotel')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('hotel')
export class HotelController {
  constructor(private readonly hotelService: HotelService) { }

  @Post('/add-hotel')
  async create(@Body() createDto: CreateHotelDto, @I18nLang() lang: string) {
    return this.hotelService.addHotel(createDto, lang);
  }

  @Get('/get-hotels')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('application_date') application_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('is_paid') is_paid?: boolean,
    @Query('system') system?: string,
    @Query('meal_plan') meal_plan?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.hotelService.getAllHotel(
      page,
      limit,
      search,
      application_date,
      opr_guid,
      prepared_opr_guid,
      is_paid,
      system,
      meal_plan,
      lang
    );
  }

  @Patch('/update-hotel')
  async update(@Body() updateDto: UpdateHotelDto, @I18nLang() lang: string) {
    return this.hotelService.updateHotel(updateDto, lang);
  }

  @Delete('/delete-hotel')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.hotelService.deleteHotel(guid, lang);
  }
}
