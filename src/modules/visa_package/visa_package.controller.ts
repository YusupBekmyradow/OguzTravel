import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VisaPackageService } from './visa_package.service';
import { CreateVisaPackageDto } from './dto/create-visa_package.dto';
import { UpdateVisaPackageDto } from './dto/update-visa_package.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Visa Packages')
@Controller('visa-package')
export class VisaPackageController {
  constructor(private readonly visaPackageService: VisaPackageService) { }


  @Post('/add-visa-package')
  async create(@Body() createDto: CreateVisaPackageDto) {
    return this.visaPackageService.addVisaPackage(createDto);
  }

  @Get('/get-all-visa-packages')
  async findAll() {
    return this.visaPackageService.getAllVisaPackages();
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