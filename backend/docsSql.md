Review the SQL
Rule	What PostgreSQL enforces
PRIMARY KEY	Every product has a unique, non-null ID.
UNIQUE (slug)	Two products cannot share the same slug.
CHECK (price >= 0)	Negative prices are rejected; 0.00 is allowed.
CHECK (stock_quantity >= 0)	Negative stock is rejected.
NOT NULL	Required fields cannot be NULL.
DEFAULT	PostgreSQL supplies a value when an insert omits that column.

The table now has all 11 columns, along with the primary key, unique constraint, and two CHECK constraints.




Step 1 — Connect to PostgreSQL
Success
SELECT version() and SELECT * FROM current_schema() confirmed TypeORM could communicate with PostgreSQL and inspect the current schema.




Step 2 — Create the migration history table

PostgreSQL created a table named migrations to track which migrations have been applied.




Step 3 — Find pending migrations

TypeORM found one migration in your source code and zero previously recorded migrations in the database.




Step 4 — Create the products table

TypeORM executed the SQL inside your migration's up() method and recorded the migration in the history table.





Table creation

public.products exists with all 11 columns.



Primary key and unique slug

Every product has an ID, and duplicate slugs are prevented.



Business constraints

Negative prices and negative stock quantities are rejected by PostgreSQL.



Migration history

CreateProducts1792400315297 is recorded as applied.



Table	Purpose
products	Stores the actual product information.
migrations	Tracks database structure changes applied by TypeORM.


stock_quantity defaults to 0.



is_active defaults to true.



image_url allows NULL.



price uses numeric(10,2), which supports two decimal places.



products_id_seq generates IDs for new products.


Entity

Defines the product structure for TypeORM.



Migration

Describes the database change in version-controlled code.



PostgreSQL

Stores and enforces the actual table structure and constraints.



POST /orders, we need two tables:
orders

One record per customer order
- Unique, non-guessable public order reference
- Customer and delivery details
- Total amount stored as a database decimal
- Order status, initially pending
- Payment status, initially unpaid
- Created and updated timestamps


order_items

The products purchased in each order
- Reference to the order and product
- Product name and SKU/identifier snapshot as appropriate
- Unit price at the time of ordering
- Quantity and line total