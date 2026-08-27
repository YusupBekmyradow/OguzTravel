import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TotalCalculation } from './entities/total_calculation.entity';

@Injectable()
export class TotalCalculationsService implements OnModuleInit {
  constructor(
    @InjectModel(TotalCalculation)
    private totalCalculationModel: typeof TotalCalculation,
  ) { }

  async onModuleInit() {
    await this.initTriggers();
  }

  private async initTriggers() {
    const sequelize = this.totalCalculationModel.sequelize;
    if (!sequelize) return;

    try {
      // -------------------------------------------------------------
      // 1. B2B & TicketPayment Triggers
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_b2b_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.receiver_opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM tbl_ticket_payments 
          WHERE b2b_guid = NEW.guid;

          IF NEW.status_guid::text = '22f0d634-5798-4e5b-9d2b-34b94ec36fbf' THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid IS TRUE THEN
            v_status := 'paid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'B2B',
            COALESCE(NEW.datetime, NOW()),
            NEW.receiver_opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_price, 0),
            COALESCE(NEW.sale_price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_b2b_to_total_calculations ON tbl_b2b;
        CREATE TRIGGER trg_sync_b2b_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_b2b
        FOR EACH ROW EXECUTE FUNCTION sync_b2b_to_total_calculations();
      `);

      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_b2b_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_target_b2b_guid UUID;
          v_total_paid DECIMAL(12, 2);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_target_b2b_guid := OLD.b2b_guid;
          ELSE
            v_target_b2b_guid := NEW.b2b_guid;
          END IF;

          IF v_target_b2b_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
            FROM tbl_ticket_payments
            WHERE b2b_guid = v_target_b2b_guid;

            UPDATE tbl_total_calculations
            SET credit_price = v_total_paid,
                "updatedAt" = NOW()
            WHERE guid = v_target_b2b_guid;
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.b2b_guid IS NOT NULL AND OLD.b2b_guid IS DISTINCT FROM NEW.b2b_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
            FROM tbl_ticket_payments
            WHERE b2b_guid = OLD.b2b_guid;

            UPDATE tbl_total_calculations
            SET credit_price = v_total_paid,
                "updatedAt" = NOW()
            WHERE guid = OLD.b2b_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_ticket_payment_to_total_calculations ON tbl_ticket_payments;
        CREATE TRIGGER trg_sync_ticket_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_ticket_payments
        FOR EACH ROW EXECUTE FUNCTION sync_b2b_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 2. Airway Trigger (tbl_airway)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_airway_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE airway_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Airway',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_airway_to_total_calculations ON tbl_airway;
        CREATE TRIGGER trg_sync_airway_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_airway
        FOR EACH ROW EXECUTE FUNCTION sync_airway_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 3. Railway Trigger (tbl_railway)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_railway_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE railway_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Railway',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_railway_to_total_calculations ON tbl_railway;
        CREATE TRIGGER trg_sync_railway_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_railway
        FOR EACH ROW EXECUTE FUNCTION sync_railway_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 4. Hotel Trigger (tbl_hotel)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_hotel_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE hotel_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Hotel',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_hotel_to_total_calculations ON tbl_hotel;
        CREATE TRIGGER trg_sync_hotel_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_hotel
        FOR EACH ROW EXECUTE FUNCTION sync_hotel_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 5. Tour Trigger (tbl_tour)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_tour_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE tour_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Tour',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_tour_to_total_calculations ON tbl_tour;
        CREATE TRIGGER trg_sync_tour_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_tour
        FOR EACH ROW EXECUTE FUNCTION sync_tour_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 6. Transfer Trigger (tbl_transfer)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_transfer_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE transfer_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Transfer',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_transfer_to_total_calculations ON tbl_transfer;
        CREATE TRIGGER trg_sync_transfer_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_transfer
        FOR EACH ROW EXECUTE FUNCTION sync_transfer_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 7. Package Trigger (tbl_package)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_package_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT COALESCE(SUM(amount), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE package_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            'Package',
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category = EXCLUDED.category,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_package_to_total_calculations ON tbl_package;
        CREATE TRIGGER trg_sync_package_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_package
        FOR EACH ROW EXECUTE FUNCTION sync_package_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 8. HAR Payments Trigger ("tbl_HAR_payments")
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_har_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_total_paid DECIMAL(12, 2);
          v_guid UUID;
        BEGIN
          -- Airway
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.airway_guid;
          ELSE
            v_guid := NEW.airway_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE airway_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.airway_guid IS NOT NULL AND OLD.airway_guid IS DISTINCT FROM NEW.airway_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE airway_guid = OLD.airway_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.airway_guid;
          END IF;

          -- Railway
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.railway_guid;
          ELSE
            v_guid := NEW.railway_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE railway_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.railway_guid IS NOT NULL AND OLD.railway_guid IS DISTINCT FROM NEW.railway_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE railway_guid = OLD.railway_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.railway_guid;
          END IF;

          -- Hotel
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.hotel_guid;
          ELSE
            v_guid := NEW.hotel_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE hotel_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.hotel_guid IS NOT NULL AND OLD.hotel_guid IS DISTINCT FROM NEW.hotel_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_HAR_payments" WHERE hotel_guid = OLD.hotel_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.hotel_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_har_payment_to_total_calculations ON "tbl_HAR_payments";
        CREATE TRIGGER trg_sync_har_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON "tbl_HAR_payments"
        FOR EACH ROW EXECUTE FUNCTION sync_har_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 9. TTP Payments Trigger ("tbl_TTP_payments")
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_ttp_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_total_paid DECIMAL(12, 2);
          v_guid UUID;
        BEGIN
          -- Tour
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.tour_guid;
          ELSE
            v_guid := NEW.tour_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE tour_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.tour_guid IS NOT NULL AND OLD.tour_guid IS DISTINCT FROM NEW.tour_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE tour_guid = OLD.tour_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.tour_guid;
          END IF;

          -- Transfer
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.transfer_guid;
          ELSE
            v_guid := NEW.transfer_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE transfer_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.transfer_guid IS NOT NULL AND OLD.transfer_guid IS DISTINCT FROM NEW.transfer_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE transfer_guid = OLD.transfer_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.transfer_guid;
          END IF;

          -- Package
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.package_guid;
          ELSE
            v_guid := NEW.package_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE package_guid = v_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.package_guid IS NOT NULL AND OLD.package_guid IS DISTINCT FROM NEW.package_guid THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM "tbl_TTP_payments" WHERE package_guid = OLD.package_guid;
            UPDATE tbl_total_calculations SET credit_price = v_total_paid, "updatedAt" = NOW() WHERE guid = OLD.package_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_ttp_payment_to_total_calculations ON "tbl_TTP_payments";
        CREATE TRIGGER trg_sync_ttp_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON "tbl_TTP_payments"
        FOR EACH ROW EXECUTE FUNCTION sync_ttp_payment_to_total_calculations();
      `);

      console.log('✅ B2B, Airway, Railway, Hotel, Tour, Transfer, Package we Töleg triggerlary üstünlikli döredildi/täsirleşdirildi.');
    } catch (error) {
      console.error('❌ Total Calculations trigger döredilende ýalňyşlyk:', error);
    }
  }
}