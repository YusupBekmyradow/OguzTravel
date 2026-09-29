import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";
import { RefferalCountry } from "../../refferal_country/entities/refferal_country.entity";

@Table({
    tableName: 'tbl_refferal_letter',
    timestamps: true
})

export class RefferalLetter extends Model<RefferalLetter> {
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
        type: DataType.UUID,
        allowNull: true
    })
    declare received_opr_guid?: string;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare client_guid?: string;

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare refferal_country_guid?: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: 1
    })
    declare passport_count?: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare destination_country?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare bgn_departure?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare bgn_arrival?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare travel_document_number?: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare departure_date?: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare return_date?: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0
    })
    declare price?: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: 'TMT'
    })
    declare currency?: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare contract_date?: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare status?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: true
    })
    declare isRefferal?: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: true
    })
    declare isOne?: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare travel_document_number1?: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    declare total_letter?: number;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare date_time?: Date;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare accepted_by?: string;


    @BelongsTo(() => Employee, {
        targetKey: 'guid',
        foreignKey: 'received_opr_guid',
        as: 'refferaloperator',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare employee: Employee;

    @BelongsTo(() => Client, {
        targetKey: 'guid',
        foreignKey: 'client_guid',
        as: 'client',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare client: Client;

    @BelongsTo(() => RefferalCountry, {
        targetKey: 'guid',
        foreignKey: 'refferal_country_guid',
        as: 'refferalCountry',
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
    })
    declare refferalCountry: RefferalCountry;
}
