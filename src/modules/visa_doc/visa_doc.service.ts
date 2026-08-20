import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { VisaDoc } from './entities/visa_doc.entity';
import { DocDetails } from './entities/doc_details.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { CreateVisaDocDto } from './dto/create-visa_doc.dto';
import { UpdateVisaDocDto } from './dto/update-visa_doc.dto';

@Injectable()
export class VisaDocsService {
  constructor(
    @InjectModel(VisaDoc) private visaDocRepo: typeof VisaDoc,
    @InjectModel(DocDetails) private docDetailsRepo: typeof DocDetails,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }


  async addVisaDoc(dto: CreateVisaDocDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const visaDoc = await this.visaDocRepo.create(
        { title: dto.title, country: dto.country ?? null } as any,
        { transaction: t },
      );
      if (dto.docDetails?.length) {
        await this.docDetailsRepo.bulkCreate(
          dto.docDetails.map((d, i) => ({
            title: d.title,
            data: d.data,
            note: d.note,
            visa_doc_guid: visaDoc.guid,
            orderIndex: d.orderIndex ?? i,
          })) as any,
          { transaction: t },
        );
      }
      await t.commit();
      const created = await this.visaDocRepo.findByPk(visaDoc.guid, {
        include: [{ model: DocDetails, separate: true, order: [['orderIndex', 'ASC']] }],
      });
      return { status: 201, data: created, message: this.i18n.t('visa_docs.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_docs.createFailed', { lang }), error);
    }
  }



  async getAllVisaDocs(
    page: number = 1,
    limit: number = 10,
    filters: { search?: string } = {},
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const conditions: string[] = [];
      const replacements: Record<string, any> = { limit: currentLimit, offset };
      if (filters.search?.trim()) {
        conditions.push(`(vd.title ILIKE :search OR vd.country ILIKE :search)`);
        replacements.search = `%${filters.search.trim()}%`;
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT
          vd.guid,
          vd.title,
          vd.country,
          vd."updatedAt",
          COUNT(dd.guid)::int AS "tableCount",
          BOOL_OR(dd.note IS NOT NULL AND dd.note <> '') AS "hasNote",
          COUNT(*) OVER()::int AS "totalItems"
        FROM tbl_visa_doc AS vd
        LEFT JOIN tbl_doc_details AS dd ON dd.visa_doc_guid = vd.guid
        ${whereClause}
        GROUP BY vd.guid, vd.title, vd.country, vd."updatedAt"
        ORDER BY vd."updatedAt" DESC
        LIMIT :limit OFFSET :offset
      `;
      const rows: any[] = await this.sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });
      const totalItems = rows[0]?.totalItems ?? 0;
      const data = rows.map(({ totalItems, ...rest }) => rest);
      return {
        status: 200,
        data,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
        },
        message: this.i18n.t('visa_docs.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_docs.fetchFailed', { lang }), error);
    }
  }



  async getOneVisaDoc(guid: string, lang: string = 'tk') {
    try {
      const visaDoc = await this.visaDocRepo.findByPk(guid, {
        include: [{ model: DocDetails, separate: true, order: [['orderIndex', 'ASC']] }],
      });
      if (!visaDoc) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_docs.notFound', { lang }));
      }
      return { status: 200, data: visaDoc, message: this.i18n.t('visa_docs.fetched', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_docs.fetchFailed', { lang }), error);
    }
  }




  async updateVisaDoc(dto: UpdateVisaDocDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      let guid = dto.guid;
      const visaDoc = await this.visaDocRepo.findByPk(guid, { transaction: t });
      if (!visaDoc) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_docs.notFound', { lang }));
      }
      await visaDoc.update(
        { title: dto.title ?? visaDoc.title, country: dto.country ?? visaDoc.country },
        { transaction: t },
      );
      if (dto.docDetails) {
        const existing = await this.docDetailsRepo.findAll({
          where: { visa_doc_guid: guid },
          attributes: ['guid'],
          transaction: t,
        });
        const existingGuids = existing.map((e) => e.guid);
        const incomingGuids = dto.docDetails.filter((d) => d.guid).map((d) => d.guid as string);
        const toDelete = existingGuids.filter((g) => !incomingGuids.includes(g));
        if (toDelete.length) {
          await this.docDetailsRepo.destroy({ where: { guid: toDelete, visa_doc_guid: guid }, transaction: t });
        }
        await Promise.all(
          dto.docDetails.map((table, i) => {
            if (table.guid) {

              return this.docDetailsRepo.update(
                { title: table.title, data: table.data, note: table.note, orderIndex: table.orderIndex ?? i },
                { where: { guid: table.guid, visa_doc_guid: guid }, transaction: t },
              );
            }
            return this.docDetailsRepo.create(
              {
                visa_doc_guid: guid,
                title: table.title,
                data: table.data,
                note: table.note,
                orderIndex: table.orderIndex ?? i,
              } as any,
              { transaction: t },
            );
          }),
        );
      }
      await t.commit();
      const updated = await this.visaDocRepo.findByPk(guid, {
        include: [{ model: DocDetails, separate: true, order: [['orderIndex', 'ASC']] }],
      });
      return { status: 200, data: updated, message: this.i18n.t('visa_docs.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_docs.updateFailed', { lang }), error);
    }
  }




  async deleteVisaDoc(guid: string, lang: string) {
    try {
      const visaDoc = await this.visaDocRepo.findByPk(guid);
      if (!visaDoc) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_docs.notFound', { lang }));
      }
      await visaDoc.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('visa_docs.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_docs.deleteFailed', { lang }), error);
    }
  }
}