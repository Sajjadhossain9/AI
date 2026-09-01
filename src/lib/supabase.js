import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ywrrnzvyieayhtthbzyg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CG5a0zxwXsDv4yz3lzKc4Q_IHvZf_ku'

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

function ensureSupabase() {
  if (!supabase) throw new Error('Store backend is not connected.')
}

export async function fetchProducts() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, category, description, initials, tag, status, active, featured, sort_order')
    .eq('active', true)
    .order('sort_order')
    .order('name')
  if (error) throw error
  return data || []
}

export async function fetchPlans() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('product_plans')
    .select('id, product_slug, product_name, label, duration_days, price, price_max, compare_at_price, currency, active')
    .eq('active', true)
    .order('product_slug')
    .order('duration_days')
  if (error) throw error
  return data || []
}

export async function createOrder(payload) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('create_public_order', { order_payload: payload })
  if (error) throw error
  return data
}

export async function adminNeedsSetup() {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_needs_setup')
  if (error) throw error
  return Boolean(data)
}

export async function adminInitialize(password) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_initialize', { p_new_password: password })
  if (error) throw error
  return data
}

export async function adminLogin(password) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_login', { p_password: password })
  if (error) throw error
  return data
}

export async function adminValidate(token) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_validate', { p_token: token })
  if (error) return false
  return Boolean(data)
}

export async function adminLogout(token) {
  if (!supabase || !token) return
  await supabase.rpc('admin_logout', { p_token: token })
}

export async function adminCatalog(token) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_catalog', { p_token: token })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function adminSaveProduct(token, payload) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_save_product', { p_token: token, p_payload: payload })
  if (error) throw error
  return data
}

export async function adminSavePlan(token, payload) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_save_plan', { p_token: token, p_payload: payload })
  if (error) throw error
  return data
}

export async function adminArchiveProduct(token, productId) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_archive_product', { p_token: token, p_product_id: productId })
  if (error) throw error
  return data
}

export async function adminChangePassword(token, currentPassword, newPassword) {
  ensureSupabase()
  const { data, error } = await supabase.rpc('admin_change_password', {
    p_token: token,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  })
  if (error) throw error
  return data
}
