FILE 2: prisma / schema.prisma
prisma
// ClaimAgent™ Database Schema
// PostgreSQL + Prisma ORM
// Multi-tenant, audit-ready, 50-state compliance

generator client {
    provider = "prisma-client-js"
    previewFeatures = ["fullTextSearch", "metrics"]
}

datasource db {
    provider = "postgresql"
    url = env("DATABASE_URL")
}
