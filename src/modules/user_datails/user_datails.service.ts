import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { UserDetail } from './entities/user_datail.entity';
import { UpdateUserProfileDto } from './dto/update-user_datail.dto';
import { ImagesService } from '../../common/image-upload/image-upload.module';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserDetail) private readonly userDetailRepo: typeof UserDetail,
    private readonly imagesService: ImagesService,
    private readonly i18n: I18nService,
  ) { }


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