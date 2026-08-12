// import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/sequelize';
// import { CustomField } from './entities/custom_field.entity';
// import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
// import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
// import { errorResponse, successResponse } from '../../helpers/responseFunctions';
// import { HttpStatuses } from '../../helpers/httpStatuses.enum';
// import { I18nService } from 'nestjs-i18n';

// @Injectable()
// export class CustomFieldService {
//   constructor(
//     @InjectModel(CustomField)
//     private readonly customFieldRepository: typeof CustomField,
//     private readonly i18n: I18nService,
//   ) { }

//   async addCustomField(createCustomFieldDto: CreateCustomFieldDto, lang: string = 'tk') {
//     try {
//       const existing = await this.customFieldRepository.findOne({
//         where: {
//           country_guid: createCustomFieldDto.country_guid,
//           field_key: createCustomFieldDto.field_key,
//         },
//       });

//       if (existing) {
//         throw new BadRequestException(
//           this.i18n.t('custom_field.keyExists', { lang }) ||
//           `Field key '${createCustomFieldDto.field_key}' already exists for this country`,
//         );
//       }
//       if (createCustomFieldDto.field_type === 'select') {
//         if (!createCustomFieldDto.options || createCustomFieldDto.options.length === 0) {
//           throw new BadRequestException('Options are required and must not be empty when field_type is select');
//         }
//       } else {
//         createCustomFieldDto.options = null as any;
//       }
//       const customField = await this.customFieldRepository.create({
//         ...createCustomFieldDto,
//         is_required: true,
//       } as any);

//       return successResponse(
//         HttpStatuses.CREATED,
//         customField,
//         this.i18n.t('custom_field.created', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('custom_field.createFailed', { lang }),
//         error,
//       );
//     }
//   }


  
//   async getCustomFieldsByCountry(countryGuid: string, lang: string = 'tk') {
//     try {
//       const fields = await this.customFieldRepository.findAll({
//         where: {
//           country_guid: countryGuid,
//           is_active: true,
//         },
//         order: [['sort_order', 'ASC']],
//       });
//       return successResponse(
//         HttpStatuses.OK,
//         fields,
//         this.i18n.t('custom_field.listFetched', { lang }),
//       );
//     } catch (error) {
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('custom_field.fetchFailed', { lang }),
//         error,
//       );
//     }
//   }

  
//   async updateCustomField(updateCustomFieldDto: UpdateCustomFieldDto, lang: string = 'tk') {
//     try {
//       const targetGuid = updateCustomFieldDto.guid;
//       if (!targetGuid) {
//         throw new BadRequestException('Guid is required for update');
//       }

//       const field = await this.customFieldRepository.findOne({
//         where: { guid: targetGuid },
//       });

//       if (!field) {
//         throw new NotFoundException(
//           this.i18n.t('custom_field.notFound', { lang }) || 'Custom field not found',
//         );
//       }

//       const targetCountryGuid = updateCustomFieldDto.country_guid || field.country_guid;
//       const targetFieldKey = updateCustomFieldDto.field_key || field.field_key;

//       if (
//         (updateCustomFieldDto.field_key && updateCustomFieldDto.field_key !== field.field_key) ||
//         (updateCustomFieldDto.country_guid && updateCustomFieldDto.country_guid !== field.country_guid)
//       ) {
//         const existing = await this.customFieldRepository.findOne({
//           where: {
//             country_guid: targetCountryGuid,
//             field_key: targetFieldKey,
//           },
//         });

//         if (existing && existing.guid !== targetGuid) {
//           throw new BadRequestException(
//             this.i18n.t('custom_field.keyExists', { lang }) ||
//             `Field key '${targetFieldKey}' already exists for this country`,
//           );
//         }
//       }

//       const finalFieldType = updateCustomFieldDto.field_type || field.field_type;
//       let finalOptions = updateCustomFieldDto.options !== undefined ? updateCustomFieldDto.options : field.options;

//       if (finalFieldType === 'select') {
//         if (!finalOptions || finalOptions.length === 0) {
//           throw new BadRequestException('Options are required and must not be empty when field_type is select');
//         }
//       } else {
//         finalOptions = null as any;
//       }

//       const updateData: any = {
//         ...updateCustomFieldDto,
//         field_type: finalFieldType,
//         options: finalOptions,
//         is_required: true,
//       };
//       delete updateData.guid;

//       await this.customFieldRepository.update(updateData, {
//         where: { guid: targetGuid },
//       });

//       const updatedField = await this.customFieldRepository.findOne({
//         where: { guid: targetGuid },
//       });

//       return successResponse(
//         HttpStatuses.OK,
//         updatedField,
//         this.i18n.t('custom_field.updated', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('custom_field.updateFailed', { lang }),
//         error,
//       );
//     }
//   }



//   async deleteCustomField(guid: string, lang: string = 'tk') {
//     try {
//       const field = await this.customFieldRepository.findOne({ where: { guid } });
//       if (!field) {
//         throw new NotFoundException(
//           this.i18n.t('custom_field.notFound', { lang }) || 'Custom field not found',
//         );
//       }

//       await this.customFieldRepository.update(
//         { is_active: false } as any,
//         { where: { guid } },
//       );

//       return successResponse(
//         HttpStatuses.OK,
//         null,
//         this.i18n.t('custom_field.deleted', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('custom_field.deleteFailed', { lang }),
//         error,
//       );
//     }
//   }
// }
