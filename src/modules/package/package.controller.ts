import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Package')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) { }

  @Post('/add-package')
  async create(@Body() createDto: CreatePackageDto) {
    return this.packageService.addPackage(createDto);
  }

  @Get('/get-packages')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.packageService.getAllPackage(Number(page), Number(limit));
  }

  @Patch('/update-package')
  async update(@Body() updateDto: UpdatePackageDto) {
    return this.packageService.updatePackage(updateDto);
  }

  @Delete('/delete-package')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.packageService.deletePackage(guid);
  }
}