import { Table, Model, DataType, Column, BeforeSave, BeforeUpdate, BelongsTo, HasMany } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { HarPayment } from "../../har_payment/entities/har_payment.entity";

@Table({
    tableName: 'tbl_airway',
    timestamps: true
})
export class Airway extends Model<Airway> {
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
        allowNull: false
    })
    declare opr_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare client_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
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
        allowNull: false
    })
    declare cost: number;

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
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    declare is_paid: boolean;

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
        foreignKey: 'airway_guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare harPaymentOpr: HarPayment[];

    @BeforeSave
    @BeforeUpdate
    static calculateProfit(instance: Airway) {
        const cost = Number(instance.cost) || 0;
        const price = Number(instance.price) || 0;
        instance.profit = price - cost;
    }
}