import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';


@ApiTags('Positions')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) { }

  @Post('/add-position')
  async create(@Body() createPositionDto: CreatePositionDto, @I18nLang() lang: string) {
    return this.positionService.addPosition(createPositionDto, lang);
  }

  @Get('/get-all-postions')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.positionService.getAllPosition(lang);
  }

  @Patch('/update-postion')
  async update(@Body() updatePositionDto: UpdatePositionDto, @I18nLang() lang: string) {
    return this.positionService.updatePosition(updatePositionDto, lang);
  }


  @Delete('/delete-postion')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.positionService.deletePosition(guid, lang);
  }
}


