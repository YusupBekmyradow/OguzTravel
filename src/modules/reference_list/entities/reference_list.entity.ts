import { Column, DataType, Table } from "sequelize-typescript";

@Table({
    tableName: 'tbl_reference_list',
    timestamps: true
})

export class ReferenceList {
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
        allowNull: false
    })
    declare office_guid: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        unique: true
    })
    declare application_number: number;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare client_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare destination_country: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare transit_country: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        unique: true
    })
    declare trvl_document_num: number;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare departure_date: Date;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare arrival_date: Date;

    @Column({
        type: DataType.DECIMAL,
        defaultValue: 0
    })
    declare price: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: 'TMT'
    })
    declare currency: string;

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare operator_guid: string;

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
        type: DataType.NUMBER,
        allowNull: false,
        unique: true
    })
    declare contract_number: number;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare contract_date: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;

}
