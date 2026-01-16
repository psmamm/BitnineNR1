-- Migration: 029_lighter_support.sql
-- Description: Add Lighter DEX support to exchange_connections table
-- Date: 2026-01-16

-- Add Lighter-specific columns to exchange_connections table
-- These columns store the additional data needed for Lighter DEX integration

-- Account index (3-254) - Lighter uses integer-indexed accounts
ALTER TABLE exchange_connections ADD COLUMN lighter_account_index INTEGER;

-- API key index for Lighter (different from main account index)
ALTER TABLE exchange_connections ADD COLUMN lighter_api_key_index INTEGER;

-- Ethereum wallet address associated with the Lighter account
ALTER TABLE exchange_connections ADD COLUMN lighter_wallet_address TEXT;

-- Create an index on lighter_wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_exchange_connections_lighter_wallet
ON exchange_connections(lighter_wallet_address)
WHERE lighter_wallet_address IS NOT NULL;

-- Create an index on exchange_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_exchange_connections_exchange_id
ON exchange_connections(exchange_id);
