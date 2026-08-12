// import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/sequelize';
// import { Receiving } from './entities/receiving.entity';
// import { CustomField } from '../custom_field/entities/custom_field.entity';
// import { Country } from '../country/entities/country.entity';
// import { Office } from '../office/entities/office.entity';
// import { Employee } from '../employee/entities/employee.entity';
// import { Client } from '../client/entities/client.entity';
// import { CreateReceivingDto } from './dto/create-receiving.dto';
// import { UpdateReceivingDto } from './dto/update-receiving.dto';
// import { errorResponse, successResponse } from '../../helpers/responseFunctions';
// import { HttpStatuses } from '../../helpers/httpStatuses.enum';
// import { I18nService } from 'nestjs-i18n';

// @Injectable()
// export class ReceivingService {
//   constructor(
//     @InjectModel(Receiving)
//     private readonly receivingRepository: typeof Receiving,
//     @InjectModel(CustomField)
//     private readonly customFieldRepository: typeof CustomField,
//     private readonly i18n: I18nService,
//   ) { }

//   private async validateExtraData(
//     countryGuid?: string,
//     extraData: Record<string, any> = {},
//     lang: string = 'tk',
//   ): Promise<void> {
//     if (!countryGuid) return;

//     const fields = await this.customFieldRepository.findAll({
//       where: {
//         country_guid: countryGuid,
//         is_active: true,
//       },
//     });

//     for (const field of fields) {
//       const val = extraData ? extraData[field.field_key] : undefined;

//       // Required check (all custom fields are required)
//       if (val === undefined || val === null || val === '') {
//         throw new BadRequestException(
//           `Field '${field.field_key}' is required and cannot be empty in extra_data`,
//         );
//       }

//       // Select check
//       if (field.field_type === 'select') {
//         const options = field.options || [];
//         if (!options.includes(String(val))) {
//           throw new BadRequestException(
//             `Value '${val}' for field '${field.field_key}' is not allowed in options: ${options.join(', ')}`,
//           );
//         }
//       }

//       // Number check
//       if (field.field_type === 'number') {
//         if (typeof val !== 'number' && isNaN(Number(val))) {
//           throw new BadRequestException(
//             `Value '${val}' for field '${field.field_key}' must be a valid number`,
//           );
//         }
//       }

//       // Date check
//       if (field.field_type === 'date') {
//         if (isNaN(Date.parse(val))) {
//           throw new BadRequestException(
//             `Value '${val}' for field '${field.field_key}' must be a valid date string`,
//           );
//         }
//       }
//     }
//   }

//   private getIncludes() {
//     return [
//       { model: Country },
//       { model: Office },
//       { model: Employee, as: 'operator_rec', attributes:['guid','fullName'] },
//       { model: Client, attributes:['guid','fullName','dateOfBirth','passport_number']},
//     ];
//   }

//   async addReceiving(createReceivingDto: CreateReceivingDto, lang: string = 'tk') {
//     try {
//       await this.validateExtraData(
//         createReceivingDto.country_guid,
//         createReceivingDto.extra_data,
//         lang,
//       );

//       const receiving = await this.receivingRepository.create({ ...createReceivingDto } as any);
//       const createdReceiving = await this.receivingRepository.findOne({
//         where: { guid: receiving.guid },
//         include: this.getIncludes(),
//       });

//       return successResponse(
//         HttpStatuses.CREATED,
//         createdReceiving,
//         this.i18n.t('receiving.created', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('receiving.createFailed', { lang }),
//         error,
//       );
//     }
//   }

//   async getAllReceiving(
//     page: number = 1,
//     limit: number = 10,
//     filters?: { country_guid?: string; office_guid?: string; operator_guid?: string },
//     lang: string = 'tk',
//   ) {
//     try {
//       const currentPage = Math.max(1, Number(page));
//       const currentLimit = Math.max(1, Number(limit));
//       const offset = (currentPage - 1) * currentLimit;

//       const whereClause: any = {};
//       if (filters?.country_guid) whereClause.country_guid = filters.country_guid;
//       if (filters?.office_guid) whereClause.office_guid = filters.office_guid;
//       if (filters?.operator_guid) whereClause.operator_guid = filters.operator_guid;

//       const { rows, count } = await this.receivingRepository.findAndCountAll({
//         where: whereClause,
//         include: this.getIncludes(),
//         order: [['createdAt', 'DESC']],
//         limit: currentLimit,
//         offset,
//       });

//       return {
//         status: HttpStatuses.OK,
//         data: rows,
//         meta: {
//           totalItems: count,
//           totalPages: Math.ceil(count / currentLimit),
//           currentPage,
//         },
//         message: this.i18n.t('receiving.listFetched', { lang }),
//       };
//     } catch (error) {
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('receiving.fetchFailed', { lang }),
//         error,
//       );
//     }
//   }

  

//   async updateReceiving(updateReceivingDto: UpdateReceivingDto, lang: string = 'tk') {
//     try {
//       const targetGuid =updateReceivingDto.guid;
//       if (!targetGuid) {
//         throw new BadRequestException('Guid is required for update');
//       }

//       const receiving = await this.receivingRepository.findOne({
//         where: { guid: targetGuid },
//       });

//       if (!receiving) {
//         throw new NotFoundException(
//           this.i18n.t('receiving.notFound', { lang }) || 'Receiving record not found',
//         );
//       }

//       if (updateReceivingDto.extra_data !== undefined || updateReceivingDto.country_guid !== undefined) {
//         const targetCountry = updateReceivingDto.country_guid || receiving.country_guid;
//         const mergedExtraData = {
//           ...(receiving.extra_data || {}),
//           ...(updateReceivingDto.extra_data || {}),
//         };
//         await this.validateExtraData(targetCountry, mergedExtraData, lang);
//       }

//       const updateData: any = { ...updateReceivingDto };
//       delete updateData.guid;

//       await this.receivingRepository.update(updateData, {
//         where: { guid: targetGuid },
//       });

//       const updatedReceiving = await this.receivingRepository.findOne({
//         where: { guid: targetGuid },
//         include: this.getIncludes(),
//       });

//       return successResponse(
//         HttpStatuses.OK,
//         updatedReceiving,
//         this.i18n.t('receiving.updated', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('receiving.updateFailed', { lang }),
//         error,
//       );
//     }
//   }

  
//   async deleteReceiving(guid: string, lang: string = 'tk') {
//     try {
//       const receiving = await this.receivingRepository.findOne({ where: { guid } });
//       if (!receiving) {
//         throw new NotFoundException(
//           this.i18n.t('receiving.notFound', { lang }) || 'Receiving record not found',
//         );
//       }

//       await this.receivingRepository.destroy({ where: { guid } });

//       return successResponse(
//         HttpStatuses.OK,
//         null,
//         this.i18n.t('receiving.deleted', { lang }),
//       );
//     } catch (error) {
//       if (error instanceof BadRequestException || error instanceof NotFoundException) {
//         throw error;
//       }
//       return errorResponse(
//         HttpStatuses.INTERNAL_SERVER_ERROR,
//         this.i18n.t('receiving.deleteFailed', { lang }),
//         error,
//       );
//     }
//   }
// }
