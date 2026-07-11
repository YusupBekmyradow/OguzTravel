import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { Tstatus } from "../../tstatus/entities/tstatus.entity";
import { Office } from "../../office/entities/office.entity";

@Table({
    tableName: 'tbl_turkishAirlines',
    timestamps: true
})
export class TurkishAirline extends Model<TurkishAirline> {

    @Column({
        primaryKey: true,
        allowNull: false,
        defaultValue: DataType.UUIDV4,
        type: DataType.UUID
    })
    declare guid: string;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare datetime: Date;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare assignment_opr_guid: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare receiver_opr_guid: string;

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
        allowNull: false
    })
    declare client_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare milesSmiles: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare status_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare pnr: string;

    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: false,
    })
    declare ticket_number: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare route: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare class: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare flight_date: Date;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare total_price: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare base_fare: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare quoted_price: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare accepted_price: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare returned_price: number;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare office_guid: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        allowNull: false,
        unique: true
    })
    declare index_number: number;

    @BelongsTo(() => Employee, {
        targetKey: 'guid',
        foreignKey: 'assignment_opr_guid',
        as: 'ta_assignment_operator'
    })
    declare assignment_operator: Employee;

    @BelongsTo(() => Employee, {
        targetKey: 'guid',
        foreignKey: 'receiver_opr_guid',
        as: 'ta_receiver_operator'
    })
    declare receiver_operator: Employee;

    @BelongsTo(() => Client, {
        targetKey: 'guid',
        foreignKey: 'client_guid'
    })
    declare client: Client;

    @BelongsTo(() => Tstatus, {
        targetKey: 'guid',
        foreignKey: 'status_guid'
    })
    declare tstatus: Tstatus;

    @BelongsTo(() => Office, {
        targetKey: 'guid',
        foreignKey: 'office_guid'
    })
    declare office: Office;
}

