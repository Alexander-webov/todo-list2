// lib/customers.js
import { supabaseAdmin } from './supabase.js';

export async function upsertCustomer(customerData) {
  const db = supabaseAdmin();
  const { external_id, source, name, avatar, profile_url } = customerData;
  if (!external_id || !source) return null;

  const { data: existing } = await db
    .from('customers')
    .select('id')
    .eq('external_id', String(external_id))
    .eq('source', source)
    .single();

  if (existing) {
    await db.from('customers').update({
      last_seen_at: new Date().toISOString(),
      ...(name && { name }),
      ...(avatar && { avatar }),
    }).eq('id', existing.id);
    return existing.id;
  }

  const { data } = await db.from('customers').insert({
    external_id: String(external_id),
    source,
    name: name || null,
    avatar: avatar || null,
    profile_url: profile_url || null,
    total_projects: 1,
    reliability_score: 50,
  }).select('id').single();

  return data?.id;
}

export async function updateCustomerStats(source) {
  const db = supabaseAdmin();

  const { data: customers } = await db
    .from('customers')
    .select('id, external_id, source')
    .eq('source', source);

  if (!customers?.length) return;

  for (const customer of customers) {
    const { data: projects } = await db
      .from('projects')
      .select('budget_min, budget_max, category')
      .eq('customer_external_id', customer.external_id)
      .eq('customer_source', source);

    if (!projects?.length) continue;

    const budgets = projects.map(p => p.budget_min || p.budget_max || 0).filter(b => b > 0);
    const avgBudget = budgets.length
      ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
      : 0;

    const catCount = {};
    projects.forEach(p => {
      if (p.category) catCount[p.category] = (catCount[p.category] || 0) + 1;
    });
    const preferredCategories = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Чем больше проектов — тем надёжнее (до 100)
    const reliability = Math.min(100, 40 + projects.length * 5);

    await db.from('customers').update({
      total_projects: projects.length,
      avg_budget: avgBudget,
      preferred_categories: preferredCategories,
      reliability_score: reliability,
    }).eq('id', customer.id);
  }

  console.log(`[Customers] Обновлено ${source}: ${customers.length} заказчиков`);
}
