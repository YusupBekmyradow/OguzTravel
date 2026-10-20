import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_hotel"
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "hotel_name" DROP NOT NULL,
      ALTER COLUMN "room_type" DROP NOT NULL,
      ALTER COLUMN "meal_plan" DROP NOT NULL,
      ALTER COLUMN "guests_count" DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_airway"
      ALTER COLUMN "ticket_number" DROP NOT NULL,
      ALTER COLUMN "ticket_type" DROP NOT NULL,
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "route" DROP NOT NULL,
      ALTER COLUMN "passenger_count" DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_railway"
      ALTER COLUMN "ticket_number" DROP NOT NULL,
      ALTER COLUMN "train_type" DROP NOT NULL,
      ALTER COLUMN "ticket_type" DROP NOT NULL,
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "route" DROP NOT NULL,
      ALTER COLUMN "passenger_count" DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_tour"
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "tour_name" DROP NOT NULL,
      ALTER COLUMN "guests_count" DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_transfer"
      ALTER COLUMN "destination_country" DROP NOT NULL,
      ALTER COLUMN "transfer_type" DROP NOT NULL,
      ALTER COLUMN "route" DROP NOT NULL,
      ALTER COLUMN "machine_type" DROP NOT NULL,
      ALTER COLUMN "guests_count" DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_package"
      ALTER COLUMN "destination_country" DROP NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_hotel"
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "hotel_name" SET NOT NULL,
      ALTER COLUMN "room_type" SET NOT NULL,
      ALTER COLUMN "meal_plan" SET NOT NULL,
      ALTER COLUMN "guests_count" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_airway"
      ALTER COLUMN "ticket_number" SET NOT NULL,
      ALTER COLUMN "ticket_type" SET NOT NULL,
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "route" SET NOT NULL,
      ALTER COLUMN "passenger_count" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_railway"
      ALTER COLUMN "ticket_number" SET NOT NULL,
      ALTER COLUMN "train_type" SET NOT NULL,
      ALTER COLUMN "ticket_type" SET NOT NULL,
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "route" SET NOT NULL,
      ALTER COLUMN "passenger_count" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_tour"
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "tour_name" SET NOT NULL,
      ALTER COLUMN "guests_count" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_transfer"
      ALTER COLUMN "destination_country" SET NOT NULL,
      ALTER COLUMN "transfer_type" SET NOT NULL,
      ALTER COLUMN "route" SET NOT NULL,
      ALTER COLUMN "machine_type" SET NOT NULL,
      ALTER COLUMN "guests_count" SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_package"
      ALTER COLUMN "destination_country" SET NOT NULL;
    `);
  }
};
