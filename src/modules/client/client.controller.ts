import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UpdatePassportDto } from './dto/updata-passport.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions, SkipPermissions } from '../../common/decorators/permissions.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ImagesService } from '../../common/image-upload/image-upload.module';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Clients')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/clients')
@Controller('client')
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly imagesService: ImagesService,
  ) { }


  @Post('/add-client')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() createClientDto: CreateClientDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string,
  ) {
    if (files && files.length > 0) {
      const savedImages = await this.imagesService.saveImages(files);
      createClientDto.images = savedImages;
    }
    return this.clientService.addClient(createClientDto, lang);
  }


  @Post(['/quick-add-client', '/create-client'])
  @SkipPermissions()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async quickAdd(
    @Body() createClientDto: CreateClientDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string,
  ) {
    if (files && files.length > 0) {
      const savedImages = await this.imagesService.saveImages(files);
      createClientDto.images = savedImages;
    }
    return this.clientService.addClient(createClientDto, lang);
  }


  @Get('/get-all-client')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('dateOfBirth') dateOfBirth?: string,
    @Query('passportExpiryDate') passportExpiryDate?: string,
    @Query('passportIssueDate') passportIssueDate?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { gender, dateOfBirth, passportExpiryDate, passportIssueDate };
    return this.clientService.getAllClient(Number(page), Number(limit), search, filters, lang);
  }


  @Patch('/update-client')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async update(
    @Body() updateClientDto: UpdateClientDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string,
  ) {
    if (files && files.length > 0) {
      const savedImages = await this.imagesService.saveImages(files);
      updateClientDto.images = savedImages;
    }
    return this.clientService.updateClient(updateClientDto, lang);
  }

  @Delete('/delete-client')
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
    return this.clientService.deleteClient(guid, lang);
  }


  @Patch('update-passport')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async updatePassport(
    @Body() updatePassportDto: UpdatePassportDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string,
  ) {
    if (files && files.length > 0) {
      const savedImages = await this.imagesService.saveImages(files);
      updatePassportDto.images = savedImages;
    }
    return this.clientService.updatePassportToHistory(updatePassportDto, lang);
  }
}
