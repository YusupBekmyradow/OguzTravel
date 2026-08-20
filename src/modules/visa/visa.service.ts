import { Injectable } from '@nestjs/common';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Visa } from './entities/visa.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class VisaService {
  constructor(
    @InjectModel(Visa) private visaRepository: typeof Visa,
    @InjectModel(Client) private clientRepository: typeof Client,
    private readonly i18n: I18nService,
  ) { }

  private getVisaIncludes() {
    return [
      { model: Employee, as: 'receiveroperator', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
      { model: Client, attributes: ['guid', 'fullName', 'phone_number', 'passport_number', 'dateOfBirth', 'passport_count', 'passportHistory'] },
    ];
  }

  private formatVisaPassport(visa: any) {
    if (!visa || !visa.client) return visa;
    const visaJson = visa.toJSON ? visa.toJSON() : visa;
    const client = visaJson.client;
    if (visaJson.passport_count && client.passport_count && visaJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find((p: any) => p.passport_count === visaJson.passport_count);
        if (oldPassport) { client.passport_number = oldPassport.passport_number; client.passportExpiryDate = oldPassport.passportExpiryDate; client.passportCountryOfIssue = oldPassport.passportCountryOfIssue; }
      }
    }
    delete client.passportHistory;
    return visaJson;
  }

  async addVisa(createVisaDto: CreateVisaDto, lang: string) {
    try {
      const client = await this.clientRepository.findByPk(createVisaDto.client_guid);
      if (!client) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.clientNotFound', { lang }));
      const visa = await this.visaRepository.create({ ...createVisaDto, passport_count: client.passport_count || 1 } as any);
      const newVisa = await this.visaRepository.findOne({ where: { guid: visa.guid }, attributes: { exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'] }, include: this.getVisaIncludes() });
      if (!newVisa) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFoundAfterCreate', { lang }));
      return { status: 201, data: this.formatVisaPassport(newVisa), message: this.i18n.t('visa.created', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.createFailed', { lang }), error);
    }
  }

  async getAllVisa(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const { rows, count } = await this.visaRepository.findAndCountAll({ attributes: { exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'] }, include: this.getVisaIncludes(), order: [['createdAt', 'DESC']], limit: Number(limit), offset: Number(offset) });
      return { status: 200, data: rows.map(r => this.formatVisaPassport(r)), meta: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage }, message: this.i18n.t('visa.listFetched', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.fetchFailed', { lang }), error);
    }
  }

  async updateVisa(updateDto: UpdateVisaDto, lang: string) {
    try {
      const existingVisa = await this.visaRepository.findByPk(updateDto.guid);
      if (!existingVisa) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFound', { lang }));
      let updateData: any = { ...updateDto };
      if (updateDto.client_guid && updateDto.client_guid !== existingVisa.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid);
        if (client) updateData.passport_count = client.passport_count || 1;
      } else { updateData.passport_count = existingVisa.passport_count; }
      const [affectedCount] = await this.visaRepository.update(updateData, { where: { guid: updateDto.guid } });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFound', { lang }));
      const newVisa = await this.visaRepository.findOne({ where: { guid: updateDto.guid }, attributes: { exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'] }, include: this.getVisaIncludes() });
      return { status: 200, data: this.formatVisaPassport(newVisa), message: this.i18n.t('visa.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.updateFailed', { lang }), error);
    }
  }

  async deleteVisa(guid: string, lang: string) {
    try {
      const visa = await this.visaRepository.findByPk(guid);
      if (!visa) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFound', { lang }));
      await visa.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('visa.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.deleteFailed', { lang }), error);
    }
  }
}
