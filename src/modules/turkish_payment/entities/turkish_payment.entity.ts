import { Table, Model, Column, DataType, BelongsTo } from "sequelize-typescript";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
    tableName: 'tbl_turkish_payments',
    timestamps: true
})

export class TurkishPayment extends Model<TurkishPayment> {
    @Column({
        primaryKey: true,
        allowNull: false,
        defaultValue: DataType.UUIDV4,
        type: DataType.UUID
    })
    declare guid: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare amount: number;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare turkish_airline_guid: string;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare payment_date: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare opr_guid: string;

    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true
    })
    declare index_number: number;

    @BelongsTo(() => TurkishAirline, {
        targetKey: 'guid',
        foreignKey: 'turkish_airline_guid'
    })
    declare turkishAirline: TurkishAirline;

    @BelongsTo(() => Employee, {
        targetKey: 'guid',
        foreignKey: 'opr_guid',
        as: 'operator',
    })
    declare operator: Employee;
}