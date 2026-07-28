import { Model, Column, DataType, Table } from "sequelize-typescript";

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
    declare client_guid: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare hotel: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare paid_tmt: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare paid_usd: number;

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare paid_date: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    })
    declare due: number;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare note?: string;
}
