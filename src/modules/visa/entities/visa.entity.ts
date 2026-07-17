import { Table, Model, Column, DataType, BelongsTo, HasMany } from "sequelize-typescript";
import { Client } from "../../client/entities/client.entity";
import { VisaPackage } from "../../visa_package/entities/visa_package.entity";
import { VisaPayment } from "../../visa_payment/entities/visa_payment.entity";

@Table({
  tableName: 'tbl_visa',
  timestamps: true
})

export class Visa extends Model<Visa> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare index_number: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare datetime: Date;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare client_guid: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { phone: null, name: null }
  })
  declare agent: {
    name: string,
    phone_number: string
  };

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare package_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare service_guid: string

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare hotel_booking_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare translation_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare courier_guid: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_tmt: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_usd: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid'
  })
  declare client: Client;

  @BelongsTo(() => VisaPackage, {
    targetKey: 'guid',
    foreignKey: 'package_guid',
    as: 'package'
  })
  declare package: VisaPackage;

  @BelongsTo(() => VisaPackage, {
    targetKey: 'guid',
    foreignKey: 'service_guid',
    as: 'service'
  })
  declare service: VisaPackage;

  @BelongsTo(() => VisaPackage, {
    targetKey: 'guid',
    foreignKey: 'hotel_booking_guid',
    as: 'hotel_booking'

  })
  declare hotel_booking: VisaPackage;

  @BelongsTo(() => VisaPackage, {
    targetKey: 'guid',
    foreignKey: 'translation_guid',
    as: 'translation'
  })
  declare translation: VisaPackage;

  @BelongsTo(() => VisaPackage, {
    targetKey: 'guid',
    foreignKey: 'courier_guid',
    as: 'courier'
  })
  declare courier: VisaPackage;

  @HasMany(() => VisaPayment, {
    foreignKey: 'visa_guid',
    sourceKey: 'guid',
  })
  declare visaPayment: VisaPayment[];
}
