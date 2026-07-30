import { Model, Column, DataType, Table, HasMany, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { VisaPayment } from "../../visa_payment/entities/visa_payment.entity";

@Table({
    tableName: 'tbl_inbound',
    timestamps: true
})

export class Inbound extends Model<Inbound> {
    @Column({
        primaryKey: true,
        allowNull: false,
        defaultValue: DataType.UUIDV4,
        type: DataType.UUID
    })
    declare guid: string;

    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true
    })
    declare index_number: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare invoice_number: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare invoice_date: Date;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare receiver_opr_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare client_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare hotel: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare paid_tmt: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare paid_usd: number;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare paid_date?: Date | null;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare due?: number;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    })
    declare is_paid: boolean;

    @BelongsTo(() => Employee, {
        targetKey: 'guid',
        foreignKey: 'receiver_opr_guid',
        as: 'INreceiveroperator',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare receiver_operator: Employee;

    @BelongsTo(() => Client, {
        targetKey: 'guid',
        foreignKey: 'client_guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare client: Client;

    @HasMany(() => VisaPayment, {
        foreignKey: 'inbound_guid',
        sourceKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare visaPayment: VisaPayment[];
}
