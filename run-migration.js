const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// .env.localファイルを手動でパース
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

// マイグレーションSQL
const migrationSQL = `
-- HS総販にセルアップを含めるかどうかのフラグを追加
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS include_cellup_in_hs_total BOOLEAN DEFAULT false;

-- event_summaryビューを更新して、セルアップ含む/含まないに対応
DROP VIEW IF EXISTS event_summary CASCADE;

CREATE OR REPLACE VIEW event_summary AS
SELECT
    e.id,
    e.venue,
    e.agency_name,
    e.start_date,
    e.end_date,
    e.year,
    e.month,
    e.week_number,
    e.include_cellup_in_hs_total,
    CONCAT(e.year, '年', e.month, '月第', e.week_number, '週') as period_display,
    (e.end_date - e.start_date + 1) as event_days,
    COALESCE(p.target_hs_total, 0) as target_hs_total,
    -- HS総販: セルアップを含むかどうかで計算を分岐
    CASE
        WHEN e.include_cellup_in_hs_total = true THEN
            COALESCE(
                (SELECT SUM(
                    COALESCE(au_mnp_sp1, 0) + COALESCE(au_mnp_sp2, 0) + COALESCE(au_mnp_sim, 0) +
                    COALESCE(uq_mnp_sp1, 0) + COALESCE(uq_mnp_sp2, 0) + COALESCE(uq_mnp_sim, 0) +
                    COALESCE(au_hs_sp1, 0) + COALESCE(au_hs_sp2, 0) + COALESCE(au_hs_sim, 0) +
                    COALESCE(uq_hs_sp1, 0) + COALESCE(uq_hs_sp2, 0) + COALESCE(uq_hs_sim, 0) +
                    COALESCE(cell_up_sp1, 0) + COALESCE(cell_up_sp2, 0) + COALESCE(cell_up_sim, 0)
                ) FROM staff_performances WHERE event_id = e.id),
                0
            )
        ELSE
            COALESCE(
                (SELECT SUM(
                    COALESCE(au_mnp_sp1, 0) + COALESCE(au_mnp_sp2, 0) + COALESCE(au_mnp_sim, 0) +
                    COALESCE(uq_mnp_sp1, 0) + COALESCE(uq_mnp_sp2, 0) + COALESCE(uq_mnp_sim, 0) +
                    COALESCE(au_hs_sp1, 0) + COALESCE(au_hs_sp2, 0) + COALESCE(au_hs_sim, 0) +
                    COALESCE(uq_hs_sp1, 0) + COALESCE(uq_hs_sp2, 0) + COALESCE(uq_hs_sim, 0)
                ) FROM staff_performances WHERE event_id = e.id),
                0
            )
    END as actual_hs_total,
    COALESCE(
        (SELECT SUM(COALESCE(au_mnp_sp1, 0) + COALESCE(au_mnp_sp2, 0) + COALESCE(au_mnp_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_au_mnp,
    COALESCE(
        (SELECT SUM(COALESCE(uq_mnp_sp1, 0) + COALESCE(uq_mnp_sp2, 0) + COALESCE(uq_mnp_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_uq_mnp,
    COALESCE(
        (SELECT SUM(COALESCE(au_hs_sp1, 0) + COALESCE(au_hs_sp2, 0) + COALESCE(au_hs_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_au_new,
    COALESCE(
        (SELECT SUM(COALESCE(uq_hs_sp1, 0) + COALESCE(uq_hs_sp2, 0) + COALESCE(uq_hs_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_uq_new,
    COALESCE(
        (SELECT SUM(COALESCE(cell_up_sp1, 0) + COALESCE(cell_up_sp2, 0) + COALESCE(cell_up_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_cellup,
    e.created_at
FROM events e
LEFT JOIN performances p ON p.event_id = e.id
ORDER BY e.created_at DESC;
`;

async function runMigration() {
  try {
    console.log('Executing migration via Supabase REST API...\n');

    const url = new URL(supabaseUrl);
    const projectRef = url.hostname.split('.')[0];
    const apiUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`;

    // PostgreSQL REST APIを使用してSQLを実行
    const postData = JSON.stringify({ query: migrationSQL });

    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    };

    console.log('Note: Direct SQL execution via Supabase client is limited.');
    console.log('\nPlease execute the following SQL manually in Supabase Dashboard (SQL Editor):\n');
    console.log('----------------------------------------');
    console.log(migrationSQL);
    console.log('----------------------------------------\n');
    console.log('Steps:');
    console.log('1. Go to: https://app.supabase.com/project/' + projectRef + '/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Paste it into the SQL Editor');
    console.log('4. Click "Run"');
    console.log('\nAlternatively, checking if column already exists...');

    // テーブル構造を確認
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.from('events').select('*').limit(1);

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      if (columns.includes('include_cellup_in_hs_total')) {
        console.log('\n✅ Column "include_cellup_in_hs_total" already exists in events table!');
        console.log('Migration may have already been applied.');
      } else {
        console.log('\n⚠️  Column "include_cellup_in_hs_total" NOT found in events table.');
        console.log('Please run the SQL manually in Supabase Dashboard.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
