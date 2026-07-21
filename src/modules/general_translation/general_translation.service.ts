import { Injectable } from '@nestjs/common';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';
import { InjectModel } from '@nestjs/sequelize';
import { GeneralTranslation } from './entities/general_translation.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { Translator } from '../translator/entities/translator.entity';
import { Office } from '../office/entities/office.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class GeneralTranslationService {
  constructor(
    @InjectModel(GeneralTranslation) private translationRepository: typeof GeneralTranslation
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      { model: Translator, attributes: ['guid', 'fullName'] },
    ];
  }

  async addGeneralTranslation(createDto: CreateGeneralTranslationDto) {
    try {
      const translation = await this.translationRepository.create({ ...createDto } as any);

      const newTranslation = await this.translationRepository.findOne({
        where: { guid: translation.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid']
        },
        include: this.getIncludes()
      });

      return { status: 201, data: newTranslation, message: 'Translation created successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translation creation failed', error);
    }
  }


  async getAllGeneralTranslation(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.translationRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid']
        },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      return {
        status: 200,
        data: rows,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: 'Translations fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translation fetching error', error);
    }
  }


  async updateGeneralTranslation(updateDto: UpdateGeneralTranslationDto) {
    try {
      const [affectedCount] = await this.translationRepository.update(updateDto, {
        where: { guid: updateDto.guid }
      });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'Translation not found');

      const updatedTranslation = await this.translationRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid']
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTranslation, message: 'Translation updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }


  async deleteGeneralTranslation(guid: string) {
    try {
      const translation = await this.translationRepository.findByPk(guid);
      if (!translation) return errorResponse(HttpStatuses.NOT_FOUND, 'Translation not found');

      await translation.destroy();
      return successResponse(HttpStatuses.OK, null, 'Translation deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}
