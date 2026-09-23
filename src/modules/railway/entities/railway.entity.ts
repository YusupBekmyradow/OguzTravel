import { Table, Model, DataType, Column, BeforeSave, BeforeUpdate, BelongsTo, HasMany } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { HarPayment } from "../../har_payment/entities/har_payment.entity";

@Table({
    tableName: 'tbl_railway',
    timestamps: true
})
export class Railway extends Model<Railway> {
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
        type: DataType.DATE,
        allowNull: false
    })
    declare application_date: Date;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare opr_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare client_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare prepared_opr_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare ticket_number: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare train_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare ticket_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare destination_country: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare route: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare passenger_count: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare net_fare: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: 'USD'
    })
    declare currency: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare price: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: true
    })
    declare profit: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare system: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1
    })
    declare is_paid: number;

    @BelongsTo(() => Employee, {
        foreignKey: 'opr_guid',
        targetKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare operator: Employee;

    @BelongsTo(() => Client, {
        foreignKey: 'client_guid',
        targetKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare client: Client;

    @BelongsTo(() => Employee, {
        foreignKey: 'prepared_opr_guid',
        targetKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare preparedOpr: Employee;

    @HasMany(() => HarPayment, {
        sourceKey: 'guid',
        foreignKey: 'railway_guid'
    })
    declare harPaymentOpr: HarPayment[];

    @BeforeSave
    @BeforeUpdate
    static calculateProfit(instance: Railway) {
        const cost = Number(instance.net_fare) || 0;
        const price = Number(instance.price) || 0;
        instance.profit = price - cost;
    }
}