import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export async function fetchPlans() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('product_plans')
    .select('id, product_slug, label, duration_days, price, currency, active')
    .eq('active', true)
    .order('product_slug')
    .order('duration_days')

  if (error) throw error
  return data || []
}

export async function createOrder(payload) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.rpc('create_public_order', {
    order_payload: payload,
  })
  if (error) throw error
  return data
}

export async function lookupOrder(orderCode, email) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.rpc('get_public_order_status', {
    p_order_code: orderCode,
    p_email: email,
  })
  if (error) throw error
  return data
}

export async function signInAdmin(email, password) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOutAdmin() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getCurrentSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function fetchAdminOrders() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, customer_name, email, phone, status, subtotal, currency, payment_method, payment_reference, notes, created_at, order_items(id, product_name, plan_label, unit_price, quantity)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateAdminOrderStatus(orderId, status) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw error
}

export async function fetchAdminPlans() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('product_plans')
    .select('*')
    .order('product_slug')
    .order('duration_days')
  if (error) throw error
  return data || []
}

export async function updateAdminPlan(planId, values) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase
    .from('product_plans')
    .update(values)
    .eq('id', planId)
  if (error) throw error
}
