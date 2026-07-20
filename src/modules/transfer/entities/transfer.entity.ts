import { Table, Model, DataType, Column, BeforeSave, BeforeUpdate, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Client } from "../../client/entities/client.entity";

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
    declare destination_country: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare transfer_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare route: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare machine_type: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare guests_count: number;

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

    @BelongsTo(() => Employee, {
        foreignKey: 'opr_guid',
        targetKey: 'guid'
    })
    declare operator: Employee;

    @BelongsTo(() => Client, {
        foreignKey: 'client_guid',
        targetKey: 'guid'
    })
    declare client: Client;

    @BelongsTo(() => Employee, {
        foreignKey: 'prepared_opr_guid',
        targetKey: 'guid'
    })
    declare preparedOpr: Employee;

    @BeforeSave
    @BeforeUpdate
    static calculateProfit(instance: Transfer) {
        const cost = Number(instance.cost) || 0;
        const price = Number(instance.price) || 0;
        instance.profit = price - cost;
    }
}