# Gift Packaging E-commerce Project

## Project goal

Build a small, functional gift packaging e-commerce website.

The initial customer journey is:

1. Product listing
2. Product detail
3. Add to cart
4. Cart page
5. Checkout
6. Order confirmation / thank-you page

Payment integration and email notifications are explicitly deferred until the complete customer journey works.

A landing page is not a priority for the initial release.

## Project structure

- `frontend/`: Next.js customer-facing application
- `backend/`: NestJS REST API
- `docs/`: project requirements and architecture documentation
- `AGENTS.md`: project-wide instructions

Use this repository as a monorepo. Keep frontend and backend responsibilities separate.

## Planned technology stack

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- Database access: TypeORM
- Version control: Git

Inspect the installed toolchain and generated project files before choosing framework versions or adding dependencies. Follow the official documentation for the selected versions.

## Product data

Real product data is not available yet.

Create realistic mock products for development. Example categories include gift boxes, wrapping paper, ribbons, gift bags, and hamper packaging.

Persist seed products in PostgreSQL. Do not hardcode separate product catalogues into frontend pages.

The data model should support product IDs, slugs, names, descriptions, prices, images, categories, stock quantities, and active status as appropriate.

Keep the mock data easy to replace with real product data later.

## Initial functional requirements

- Display products retrieved from the backend.
- Display an individual product by its identifier or slug.
- Support adding products to the cart.
- Support changing cart quantities and removing items.
- Calculate cart totals using trusted product prices.
- Collect and validate customer and delivery information at checkout.
- Create and persist an order and its items.
- Display a thank-you page for a successfully created order.

Initially, support guest checkout. Do not require registration or login unless a later requirement explicitly calls for it.

Payment must not be simulated as a real successful payment. The initial checkout creates an unpaid order.

## Development rules

1. Work in small, explicit steps.
2. Inspect existing files before editing or creating files.
3. Do not overwrite existing work without permission.
4. Do not generate the entire application in one operation.
5. Explain the purpose of the current step and provide a way to verify it.
6. Complete and verify the current step before starting another.
7. Follow the official documentation and existing code patterns.
8. Avoid unnecessary dependencies, abstractions, and infrastructure.
9. Keep secrets in environment variables. Never commit credentials.
10. Do not add payment, email, or production deployment configuration before the core customer journey is functional.

## Verification

For each feature, verify the relevant frontend behavior, API response, and database changes. Include error handling for invalid input, missing products, insufficient stock, and failed order creation.

Do not claim a feature is complete until it has been tested.