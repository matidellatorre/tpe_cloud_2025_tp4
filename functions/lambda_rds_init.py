import json
import os

import psycopg2

db_host = os.environ.get("DB_HOST")
db_port = os.environ.get("DB_PORT")
db_name = os.environ.get("DB_NAME")
db_user = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PASSWORD")


def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_password,
        )
        return conn

    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None


def create_tables(conn):
    products_table = """
    CREATE TABLE IF NOT EXISTS product (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        unit_price DECIMAL(12,2) NOT NULL,
        image_url VARCHAR(512),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """

    pools_table = """
    CREATE TABLE IF NOT EXISTS pool (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
        start_at DATE NOT NULL,
        end_at DATE NOT NULL,
        min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
        
        -- CAMPO NUEVO --
        status VARCHAR(10) NOT NULL DEFAULT 'open', -- Valores: open, success, failed

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- VALIDACIÓN AÑADIDA --
        CHECK (status IN ('open', 'success', 'failed'))
    );
    """

    requests_table = """
    CREATE TABLE IF NOT EXISTS request (
        id SERIAL PRIMARY KEY,
        pool_id INTEGER NOT NULL REFERENCES pool(id) ON DELETE CASCADE,
        email VARCHAR(254) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pool_id, email)
    );
    """

    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_pools_product_id ON pool(product_id);",
        "CREATE INDEX IF NOT EXISTS idx_pools_status ON pool(status);",
        "CREATE INDEX IF NOT EXISTS idx_requests_pool_id ON request(pool_id);",
        "CREATE INDEX IF NOT EXISTS idx_requests_email ON request(email);",
        "CREATE INDEX IF NOT EXISTS idx_products_category ON product(category);",
    ]

    update_trigger = """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_products_updated_at ON product;
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON product
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_pools_updated_at ON pool;
    CREATE TRIGGER update_pools_updated_at
        BEFORE UPDATE ON pool
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """

    tables = [products_table, pools_table, requests_table]

    try:
        with conn.cursor() as cur:
            for table_sql in tables:
                cur.execute(table_sql)
                print(f"Executed: {table_sql[:50]}...")

            for index_sql in indexes:
                cur.execute(index_sql)
                print(f"Created index: {index_sql[:50]}...")

            cur.execute(update_trigger)
            print("Created update triggers")

            conn.commit()
            print("All tables created successfully")
            return True

    except psycopg2.Error as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
        return False


def handler(event, context):
    conn = get_db_connection()
    if conn is None:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        success = create_tables(conn)

        if success:
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(
                    {
                        "message": "Database initialized successfully",
                        "tables_created": ["product", "pool", "request"],
                    }
                ),
            }
        else:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "Failed to create tables"}),
            }

    except (Exception, psycopg2.Error) as e:
        print(f"Error in handler: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "error": "An error occurred during initialization",
                    "details": str(e),
                }
            ),
        }

    finally:
        if conn:
            conn.close()
