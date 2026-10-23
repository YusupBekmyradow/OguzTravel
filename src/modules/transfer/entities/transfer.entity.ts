import { Table, Model, DataType, Column, BeforeSave, BeforeUpdate, BelongsTo, HasMany } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { TtpPayment } from "../../ttp_payment/entities/ttp_payment.entity";

@Table({
    tableName: 'tbl_transfer',
    timestamps: true
})
export class Transfer extends Model<Transfer> {
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
        type: DataType.STRING,
        allowNull: true
    })
    declare client_name?: string;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare prepared_opr_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare destination_country: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare transfer_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare route: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare machine_type: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    declare guests_count: number;

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
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1
    })
    declare is_paid: number;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @BelongsTo(() => Employee, {
        foreignKey: 'opr_guid',
        targetKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare operator: Employee;



    @BelongsTo(() => Employee, {
        foreignKey: 'prepared_opr_guid',
        targetKey: 'guid',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare preparedOpr: Employee;

    @HasMany(() => TtpPayment, {
        sourceKey: 'guid',
        foreignKey: 'transfer_guid'
    })
    declare ttpPayment: TtpPayment[];

    @BeforeSave
    @BeforeUpdate
    static calculateProfit(instance: Transfer) {
        const cost = Number(instance.net_fare) || 0;
        const price = Number(instance.price) || 0;
        instance.profit = price - cost;
    }
}