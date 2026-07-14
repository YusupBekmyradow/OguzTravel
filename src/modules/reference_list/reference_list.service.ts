import { Injectable } from '@nestjs/common';
import { CreateReferenceListDto } from './dto/create-reference_list.dto';
import { UpdateReferenceListDto } from './dto/update-reference_list.dto';

@Injectable()
export class ReferenceListService {
  create(createReferenceListDto: CreateReferenceListDto) {
    return 'This action adds a new referenceList';
  }

  findAll() {
    return `This action returns all referenceList`;
  }

  findOne(id: number) {
    return `This action returns a #${id} referenceList`;
  }

  update(id: number, updateReferenceListDto: UpdateReferenceListDto) {
    return `This action updates a #${id} referenceList`;
  }

  remove(id: number) {
    return `This action removes a #${id} referenceList`;
  }
}
