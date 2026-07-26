const fs = require('fs');

const rawData = fs.readFileSync('C:/Users/muham/.gemini/antigravity/brain/08b39f48-ddc8-462d-88e4-7b0dd48f1104/.system_generated/steps/56/output.txt', 'utf8');
const obj = JSON.parse(rawData);
const resultStr = obj.result;

const start = resultStr.indexOf('[');
const end = resultStr.lastIndexOf(']');
const jsonStr = resultStr.substring(start, end + 1);

const columns = JSON.parse(jsonStr);

let sql = '-- Alignment script to guarantee exactly the live schema\n\n';

for (const col of columns) {
    sql += 'ALTER TABLE public.' + col.table_name + ' ADD COLUMN IF NOT EXISTS ' + col.column_name + ' ' + col.data_type + ';\n';
    
    if (col.is_nullable === 'YES') {
        sql += 'ALTER TABLE public.' + col.table_name + ' ALTER COLUMN ' + col.column_name + ' DROP NOT NULL;\n';
    } else {
        if (col.column_name !== 'id') {
            sql += 'ALTER TABLE public.' + col.table_name + ' ALTER COLUMN ' + col.column_name + ' SET NOT NULL;\n';
        }
    }
    
    if (col.column_default !== null) {
        let def = col.column_default;
        sql += 'ALTER TABLE public.' + col.table_name + ' ALTER COLUMN ' + col.column_name + ' SET DEFAULT ' + def + ';\n';
    } else {
        sql += 'ALTER TABLE public.' + col.table_name + ' ALTER COLUMN ' + col.column_name + ' DROP DEFAULT;\n';
    }
}

fs.writeFileSync('C:/project/inventory/supabase/migrations/20261231000000_align_live_schema.sql', sql);
console.log('Generated alignment script.');
