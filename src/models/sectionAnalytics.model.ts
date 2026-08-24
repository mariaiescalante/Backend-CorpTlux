import { pool } from '../config/db';

export interface SectionMetric {
  section_id: string;
  section_label: string;
  views_count: number;
  total_seconds: number;
  avg_seconds: number;
  attention_percentage: number;
}

export async function getSectionMetrics(): Promise<{ sections: SectionMetric[]; totalViews: number; totalSeconds: number }> {
  const [rows] = await pool.query('SELECT * FROM section_analytics ORDER BY total_seconds DESC');
  const sections = rows as any[];
  
  const totalViews = sections.reduce((acc, s) => acc + (s.views_count || 0), 0);
  const totalSeconds = sections.reduce((acc, s) => acc + (s.total_seconds || 0), 0);

  const formatted: SectionMetric[] = sections.map((s) => {
    const views = s.views_count || 0;
    const secs = s.total_seconds || 0;
    const avg_seconds = views > 0 ? Math.round(secs / views) : 0;
    const attention_percentage = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0;
    return {
      section_id: s.section_id,
      section_label: s.section_label,
      views_count: views,
      total_seconds: secs,
      avg_seconds,
      attention_percentage,
    };
  });

  return { sections: formatted, totalViews, totalSeconds };
}

export async function trackSectionEngagement(sectionId: string, seconds: number, isNewView = false): Promise<void> {
  const viewsIncrement = isNewView ? 1 : 0;
  await pool.query(
    `INSERT INTO section_analytics (section_id, section_label, views_count, total_seconds)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        views_count = views_count + VALUES(views_count),
        total_seconds = total_seconds + VALUES(total_seconds)`,
    [sectionId, sectionId, viewsIncrement, Math.max(0, Math.round(seconds))]
  );
}
