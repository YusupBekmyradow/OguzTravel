import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VisaPackageService } from './visa_package.service';
import { CreateVisaPackageDto } from './dto/create-visa_package.dto';
import { UpdateVisaPackageDto } from './dto/update-visa_package.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Visa Packages')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/package')
@Controller('visa-package')
export class VisaPackageController {
  constructor(private readonly visaPackageService: VisaPackageService) { }


  @Post('/add-visa-package')
  async create(@Body() createDto: CreateVisaPackageDto) {
    return this.visaPackageService.addVisaPackage(createDto);
  }

  @Get('/get-visa-packages-byindex')
  async findAll(
    @Query('index') index: number
  ) {
    return this.visaPackageService.getAllVisaPackages(Number(index));
  }

  @Get('/get-visa-packages')
  async find(
  ) {
    return this.visaPackageService.getAllVisaPack();
  }

  @Patch('/update-visa-package')
  async update(@Body() updateDto: UpdateVisaPackageDto) {
    return this.visaPackageService.updateVisaPackage(updateDto);
  }

  @Delete('/delete-visa-package')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.visaPackageService.deleteVisaPackage(guid);
  }
}