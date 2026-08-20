import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserDetail } from './entities/user_datail.entity';
import { User } from '../user/entities/user.entity';
import { UserProfileService } from './user_datails.service';
import { UserProfileController } from './user_datails.controller';
import { UserModule } from '../user/user.module';
import { ImageUploadModule } from '../../common/image-upload/image-upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([UserDetail]),
    UserModule,
    ImageUploadModule
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService]
})
export class UserDatailsModule { }
