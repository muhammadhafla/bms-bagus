const fs = require('fs');
const path = require('path');

const migrationsDir = 'C:/project/inventory/supabase/migrations';

function readFile(name) {
    return fs.readFileSync(path.join(migrationsDir, name), 'utf8');
}

const dbSchema = readFile('20260101000000_database_schema.sql');
const posSetup = readFile('20260102000000_pos_setup.sql');
const v2 = readFile('20260103000000_pos_migration_v2.sql');
const v3 = readFile('20260104000000_pos_migration_v3_shifts.sql');
const voidedAt = readFile('20260416000000_add_voided_at.sql');
const realtime = readFile('20260417000000_enable_realtime_print_jobs.sql');
const fixRpc = readFile('20260418000000_fix_rpc_return.sql');
const invFuncs = readFile('20260419000000_inventory_funcs.sql');
const align = readFile('20261231000000_align_live_schema.sql');
const lastSignIn = readFile('20260628000000_add_last_sign_in_at_to_profiles.sql');
const lastSignInTrigger = readFile('20260629000000_add_sync_last_sign_in_at_trigger.sql');
const labels = readFile('20260629000001_add_label_printing_module.sql');

// File 1: Schema
let schema = `-- CORE SCHEMA\n\n`;
// Extract schema part of database_schema.sql (everything before Policies)
const dbSchemaParts = dbSchema.split('-- Drop all existing policies first');
schema += dbSchemaParts[0] + '\n';
// POS setup schema part (before RPC FUNCTIONS)
const posSetupParts = posSetup.split('-- 4. RPC FUNCTIONS');
schema += posSetupParts[0].replace('-- ============================================', '') + '\n';
// V2 schema
schema += v2.split('-- Atomic pay_transaction RPC')[0] + '\n';
// V3 schema
schema += v3.split('-- Enable RLS')[0] + '\n';
// voidedAt schema
schema += voidedAt + '\n';
// label schema
schema += labels.split('-- RLS Policies')[0] + '\n';
// lastSignIn schema
schema += lastSignIn + '\n';
// Align schema
schema += align + '\n';

// File 2: Policies
let policies = `-- CORE POLICIES\n\n`;
// We just add all policies from dbSchema
policies += '-- Base Policies\n' + dbSchemaParts[1].split('-- Insert some sample data')[0] + '\n';
// POS Setup policies
policies += '-- POS Policies\n' + posSetup.split('-- 5. ENABLE ROW LEVEL SECURITY (RLS)')[1].split('-- 6. GRANT PERMISSIONS')[0] + '\n';
// V3 policies
policies += '-- V3 Policies\n' + v3.split('-- Enable RLS')[1] + '\n';
// Label policies
policies += '-- Label Policies\n' + labels.split('-- RLS Policies')[1] + '\n';

// File 3: Functions
let funcs = `-- CORE FUNCTIONS\n\n`;
// functions from POS Setup
funcs += '-- POS Functions\n' + posSetupParts[1].split('-- 5. ENABLE ROW LEVEL SECURITY (RLS)')[0] + '\n';
// functions from V2
funcs += '-- V2 Functions\n' + v2.split('-- Atomic pay_transaction RPC')[1].split('-- Grant permissions')[0] + '\n';
// fix rpc
funcs += '-- Fix RPC\n' + fixRpc + '\n';
// inv funcs
funcs += '-- Inventory Functions\n' + invFuncs + '\n';
// last sign in trigger
funcs += '-- Auth Trigger\n' + lastSignInTrigger + '\n';
// grant permissions from pos setup
funcs += posSetup.split('-- 6. GRANT PERMISSIONS')[1] + '\n';
// grant from v2
funcs += v2.split('-- Grant permissions')[1] + '\n';

// File 4: Realtime & Seed
let seed = `-- CORE REALTIME & SEED\n\n`;
seed += realtime + '\n';
seed += '-- Seed Data\n' + dbSchema.split('-- Insert some sample data')[1] + '\n';

fs.writeFileSync(path.join(migrationsDir, '20260101000000_core_schema.sql'), schema);
fs.writeFileSync(path.join(migrationsDir, '20260101000001_core_policies.sql'), policies);
fs.writeFileSync(path.join(migrationsDir, '20260101000002_core_functions.sql'), funcs);
fs.writeFileSync(path.join(migrationsDir, '20260101000003_core_realtime_and_seed.sql'), seed);

// Clean up old files
const files = fs.readdirSync(migrationsDir);
for (const file of files) {
    if (file !== '20260101000000_core_schema.sql' &&
        file !== '20260101000001_core_policies.sql' &&
        file !== '20260101000002_core_functions.sql' &&
        file !== '20260101000003_core_realtime_and_seed.sql') {
        fs.unlinkSync(path.join(migrationsDir, file));
    }
}

console.log('Squash complete.');
