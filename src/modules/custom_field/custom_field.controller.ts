// import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
// import { CustomFieldService } from './custom_field.service';
// import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
// import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
// import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { PermissionsGuard } from '../../guards/permissions.guard';
// import { RequirePermissions } from '../../common/decorators/permissions.decorator';
// import { I18nLang } from 'nestjs-i18n';

// @ApiTags('Custom Fields')
// // @ApiBearerAuth('bearerAuth')
// // @UseGuards(JwtAuthGuard, PermissionsGuard)
// // @RequirePermissions('/intake', '/visa/applications')
// @Controller('custom_fields')
// export class CustomFieldController {
//   constructor(private readonly customFieldService: CustomFieldService) { }


//   @Post('/add-custom-field')
//   async create(
//     @Body() createCustomFieldDto: CreateCustomFieldDto,
//     @I18nLang() lang: string = 'tk',
//   ) {
//     return this.customFieldService.addCustomField(createCustomFieldDto, lang);
//   }


//   @Get('/get-by-country/:countryGuid')
//   async findByCountry(
//     @Param('countryGuid') countryGuid: string,
//     @I18nLang() lang: string = 'tk',
//   ) {
//     return this.customFieldService.getCustomFieldsByCountry(countryGuid, lang);
//   }

//   @Patch('/update-custom-field')
//   async update(
//     @Body() updateCustomFieldDto: UpdateCustomFieldDto,
//     @I18nLang() lang: string = 'tk',
//   ) {
//     return this.customFieldService.updateCustomField(updateCustomFieldDto, lang);
//   }


//   @Delete('/delete-custom-field')
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         guid: { type: 'string' },
//       },
//     },
//   })
//   async remove(
//     @Body('guid') bodyGuid: string,
//     @I18nLang() lang: string = 'tk',
//   ) {
//     return this.customFieldService.deleteCustomField(bodyGuid, lang);
//   }
// }
