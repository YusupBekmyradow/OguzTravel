import { Injectable } from '@nestjs/common';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Office } from './entities/office.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';


@Injectable()
export class OfficeService {
  constructor(
    @InjectModel(Office)
    private officeRepository: typeof Office,
  ) { }

  async addOffice(createOfficeDto: CreateOfficeDto) {
    try {
      const office = await this.officeRepository.create({
        ...createOfficeDto,
      } as any)
      return successResponse(HttpStatuses.CREATED, office, 'Office created successfully')
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Office creation failed', error)
    }
  }


  async getAllOffice() {
    try {
      const offices = await this.officeRepository.findAll({order: [['createdAt', 'DESC']]});
      return successResponse(HttpStatuses.OK, offices, 'Offices fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Offices fetching error', error);
    }
  }


 async updateOffice(updateOfficeDto: UpdateOfficeDto) {
    try {
      const office=await this.officeRepository.findOne({where:{guid: updateOfficeDto.guid}});
      if(!office) return errorResponse(HttpStatuses.NOT_FOUND, 'Office not found');

    await this.officeRepository.update(updateOfficeDto as any, { where: { guid: updateOfficeDto.guid } });

    const updatedOffice = await this.officeRepository.findOne({ where: { guid: updateOfficeDto.guid } });   
    
      return successResponse(HttpStatuses.OK, updatedOffice, 'Office updated successfully');
    } catch(error){
    return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


  async deleteOffice(guid: string) {
    try {
      const deletedCount = await this.officeRepository.destroy({
        where: { guid } 
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Office not found');
      }

      return successResponse(HttpStatuses.OK,  null, 'Office deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}