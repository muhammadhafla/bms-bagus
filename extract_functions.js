const fs = require('fs');
const path = require('path');

const migrationsDir = 'C:/project/inventory/supabase/migrations';
const newMigrationFile = path.join(migrationsDir, '20260814164742_fix_function_search_path.sql');

const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== '20260814164742_fix_function_search_path.sql' && f !== '20260814_fix_function_search_path.sql')
    .sort();

let functionBlocks = [];

// More robust regex to find the entire CREATE FUNCTION block.
// It will grab everything from CREATE FUNCTION to the closing $$ or ending ;
const regex = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+([\w.]+)\s*\([\s\S]*?\)\s*(?:RETURNS\s+[\s\S]*?)?(?:AS\s+\$\$[\s\S]*?\$\$(?:\s+LANGUAGE\s+\w+)?(?:\s+SECURITY\s+(?:DEFINER|INVOKER))?(?:\s+SET\s+[\w_]+\s*=\s*[\w_]+)*\s*;|LANGUAGE\s+\w+(?:\s+SECURITY\s+(?:DEFINER|INVOKER))?(?:\s+SET\s+[\w_]+\s*=\s*[\w_]+)*\s+AS\s+\$\$[\s\S]*?\$\$\s*;)/gi;

for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    let match;
    while ((match = regex.exec(content)) !== null) {
        let block = match[0];
        let funcName = match[1];

        // Check if it already has SET search_path
        if (block.match(/SET\s+search_path/i)) {
            continue;
        }

        // We need to inject SET search_path = public
        // Safest place is right before AS $$
        let modifiedBlock = block;
        
        // Find AS $$
        const asMatch = block.match(/AS\s+\$\$/i);
        if (asMatch) {
            const index = block.indexOf(asMatch[0]);
            modifiedBlock = block.slice(0, index) + "SET search_path = public\n" + block.slice(index);
        } else if (block.match(/\$\$/)) {
            // some cases might have AS '...' or just $$ if AS is missing?
            // PostgreSQL syntax requires AS.
        }

        functionBlocks.push({
            file: file,
            name: funcName,
            code: modifiedBlock
        });
    }
}

// Remove duplicates, keep latest, and specifically ignore rpc.create_penjualan_return if public exists
let latestFunctions = {};
for (const fb of functionBlocks) {
    latestFunctions[fb.name] = fb;
}

if (latestFunctions['rpc.create_penjualan_return'] && latestFunctions['public.create_penjualan_return']) {
    delete latestFunctions['rpc.create_penjualan_return'];
}

let output = `-- Migration to fix function_search_path_mutable by adding SET search_path = public\n\n`;

for (const name in latestFunctions) {
    const fb = latestFunctions[name];
    output += `-- Source: ${fb.file}\n`;
    output += fb.code + `\n\n`;
}

fs.writeFileSync(newMigrationFile, output);
console.log(`Successfully created ${newMigrationFile} with ${Object.keys(latestFunctions).length} functions.`);
