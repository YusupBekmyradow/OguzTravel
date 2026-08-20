import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { UserDetail } from './entities/user_datail.entity';
import { UpdateUserProfileDto } from './dto/update-user_datail.dto';
import { ImagesService } from '../../common/image-upload/image-upload.module';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserDetail) private readonly userDetailRepo: typeof UserDetail,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly imagesService: ImagesService,
    private readonly i18n: I18nService,
  ) { }


  async getAllProfiles(
    query: { page?: number; limit?: number; search?: string },
    lang: string = 'tk',
  ) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = query.search?.trim() || '';

      const tableName = this.userDetailRepo.tableName;
      const whereClause = search
        ? `WHERE full_name ILIKE :searchPattern 
           OR role ILIKE :searchPattern 
           OR contact->>'email' ILIKE :searchPattern 
           OR contact->>'phone' ILIKE :searchPattern`
        : '';
      const dataSql = `
        SELECT guid, full_name, role, status, avatar_url, contact, skills, personal_summary, work_experience, education, languages
        FROM "${tableName}"
        ${whereClause}
        ORDER BY "createdAt" DESC
        LIMIT :limit OFFSET :offset;
      `;
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM "${tableName}"
        ${whereClause};
      `;
      const replacements = {
        searchPattern: `%${search}%`,
        limit,
        offset,
      };
      const [items, countResult] = await Promise.all([
        this.sequelize.query(dataSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        this.sequelize.query<{ total: number }>(countSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
      ]);
      const total = countResult[0]?.total || 0;
      return successResponse(
        HttpStatuses.OK,
        {
          items,
          meta: {
            totalItems: total,
            itemCount: items.length,
            itemsPerPage: limit,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
          },
        },
        this.i18n.t('user.fetched', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('user.fetchFailed', { lang }),
        error,
      );
    }
  }



  async getUserProfile(userGuid: string, lang: string = 'tk') {
    try {
      let detail = await this.userDetailRepo.findOne({
        where: { user_guid: userGuid },
        attributes: { exclude: ['user_guid', 'createdAt', 'updatedAt'] },
      });
      if (!detail) {
        const defaultProfile = {
          full_name: '',
          role: '',
          status: '',
          avatar_url: '',
          contact: { email: '', phone: '', location: '', website: '', linkedin: '' },
          skills: [],
          personal_summary: '',
          work_experience: [],
          education: [],
          languages: [],
          references: [],
          references_text: '',
        };
        return {
          status: 200,
          message: this.i18n.t('user.fetched', { lang }),
          data: defaultProfile,
        };
      }
      return {
        status: 200,
        message: this.i18n.t('user.fetched', { lang }),
        data: detail,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('user.fetchFailed', { lang }),
        error,
      );
    }
  }



  async updateUserProfile(
    userGuid: string,
    dto: UpdateUserProfileDto,
    avatarFile?: Express.Multer.File,
    lang: string = 'tk') {
    try {
      let detail = await this.userDetailRepo.findOne({ where: { user_guid: userGuid } });

      if (avatarFile) {
        if (detail?.avatar_url) {
          this.imagesService.deleteFile(detail.avatar_url);
        }
        const savedPaths = await this.imagesService.saveFiles([avatarFile]);
        if (savedPaths.length > 0) {
          dto.avatar_url = savedPaths[0];
        }
      }

      if (detail) {
        await detail.update(dto as any);
      } else {
        detail = await this.userDetailRepo.create({
          user_guid: userGuid,
          ...dto,
        } as any);
      }
      return {
        status: 200,
        message: this.i18n.t('user.profileUpdated', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('user.updateFailed', { lang }),
        error,
      );
    }
  }
}