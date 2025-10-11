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
