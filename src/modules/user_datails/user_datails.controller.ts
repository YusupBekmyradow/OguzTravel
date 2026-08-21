import { Controller, Get, Patch, Body, Req, UseGuards, Headers, UseInterceptors, UploadedFile, Query, Param } from '@nestjs/common';
import { UserProfileService } from './user_datails.service';
import { I18nLang } from 'nestjs-i18n';
import { UpdateUserProfileDto } from './dto/update-user_datail.dto';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';


@ApiTags('UserProfile')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) { }

  @Get('getOne-profile/:guid')
  async getProfileByGuid(
    @Param('guid') guid: string,
    @I18nLang() lang: string = 'tk'
  ) {
    return this.userProfileService.getProfileByGuid(guid, lang);
  }


  @Get('get-user-profile')
  async getUserProfile(
    @Req() req: any,
    @I18nLang() lang: string) {
    const userGuid = req.user?.guid || req.user?.id;
    return this.userProfileService.getUserProfile(userGuid, lang);
  }


  @Patch('update-user-profile')
  @UseInterceptors(FileInterceptor('avatar_url'))
  @ApiConsumes('multipart/form-data')
  async updateUserProfile(
    @Req() req: any,
    @Body() dto: UpdateUserProfileDto,
    @UploadedFile() avatarFile: Express.Multer.File,
    @I18nLang() lang: string,
  ) {
    const userGuid = req.user?.guid || req.user?.user_guid || req.user?.id;
    return this.userProfileService.updateUserProfile(userGuid, dto, avatarFile, lang);
  }
}