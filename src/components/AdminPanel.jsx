import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, LogOut, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import {
  fetchAdminOrders,
  fetchAdminPlans,
  getCurrentSession,
  signInAdmin,
  signOutAdmin,
  supabaseConfigured,
  updateAdminOrderStatus,
  updateAdminPlan,
} from '../lib/supabase'

const orderStatuses = ['quote_requested', 'pending_payment', 'payment_review', 'processing', 'completed', 'cancelled', 'refunded']

function AdminPanel() {
  const [session, setSession] = useState(null)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [orders, setOrders] = useState([])
  const [plans, setPlans] = useState([])
  const [tab, setTab] = useState('orders')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const current = await getCurrentSession()
      setSession(current)
      if (current) {
        const [orderRows, planRows] = await Promise.all([fetchAdminOrders(), fetchAdminPlans()])
        setOrders(orderRows)
        setPlans(planRows)
      }
    } catch (err) {
      setError(err.message || 'Could not load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const login = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await signInAdmin(credentials.email, credentials.password)
      setSession(data.session)
      await load()
    } catch (err) {
      setError(err.message || 'Login failed.')
      setLoading(false)
    }
  }

  const logout = async () => {
    await signOutAdmin()
    setSession(null)
    setOrders([])
    setPlans([])
  }

  const changeStatus = async (orderId, status) => {
    setSavingId(orderId)
    setError('')
    try {
      await updateAdminOrderStatus(orderId, status)
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order))
    } catch (err) {
      setError(err.message || 'Could not update status. Make sure this account has admin role.')
    } finally {
      setSavingId(null)
    }
  }

  const savePlan = async (plan) => {
    setSavingId(plan.id)
    setError('')
    try {
      const cleanPrice = plan.price === '' || plan.price === null ? null : Number(plan.price)
      await updateAdminPlan(plan.id, { price: cleanPrice, active: Boolean(plan.active) })
    } catch (err) {
      setError(err.message || 'Could not update plan.')
    } finally {
      setSavingId(null)
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="admin-shell">
        <a className="admin-back" href="/"><ArrowLeft size={18} /> Storefront</a>
        <div className="admin-empty"><ShieldCheck size={42} /><h1>Connect Supabase first</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run the included Supabase schema.</p></div>
      </main>
    )
  }

  if (loading && !session) {
    return <main className="admin-shell"><div className="admin-empty"><Loader2 className="spin" size={34} /><p>Loading admin...</p></div></main>
  }

  if (!session) {
    return (
      <main className="admin-shell admin-login-shell">
        <a className="admin-back" href="/"><ArrowLeft size={18} /> Storefront</a>
        <form className="admin-login-card" onSubmit={login}>
          <ShieldCheck size={40} />
          <small>AIMY management</small>
          <h1>Admin sign in</h1>
          <p>Use a Supabase Auth account whose profile role is set to <code>admin</code>.</p>
          <label><span>Email</span><input type="email" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} required /></label>
          <label><span>Password</span><input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button full" type="submit" disabled={loading}>{loading ? <><Loader2 className="spin" size={18} /> Signing in...</> : 'Sign in'}</button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><a className="admin-back" href="/"><ArrowLeft size={18} /> Storefront</a><h1>AIMY Admin</h1><p>Orders, payment references and product pricing.</p></div>
        <div className="admin-header-actions"><button onClick={load}><RefreshCw size={17} /> Refresh</button><button onClick={logout}><LogOut size={17} /> Sign out</button></div>
      </header>

      {error && <div className="form-error admin-error">{error}</div>}
      <div className="admin-tabs"><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders ({orders.length})</button><button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Pricing ({plans.length})</button></div>

      {tab === 'orders' ? (
        <div className="admin-order-list">
          {orders.length === 0 ? <div className="admin-empty compact"><p>No orders yet.</p></div> : orders.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <div className="admin-order-top"><div><small>{new Date(order.created_at).toLocaleString()}</small><h3>{order.order_code}</h3></div><select value={order.status} disabled={savingId === order.id} onChange={(e) => changeStatus(order.id, e.target.value)}>{orderStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></div>
              <div className="admin-customer-grid"><span><small>Customer</small><strong>{order.customer_name}</strong></span><span><small>Email</small><strong>{order.email}</strong></span><span><small>Phone</small><strong>{order.phone}</strong></span><span><small>Total</small><strong>{order.currency} {Number(order.subtotal || 0).toFixed(2)}</strong></span></div>
              <div className="admin-items">{(order.order_items || []).map((item) => <div key={item.id}><span>{item.product_name} · {item.plan_label}</span><strong>{order.currency} {Number(item.unit_price || 0).toFixed(2)}</strong></div>)}</div>
              <div className="admin-payment"><span><small>Payment method</small>{order.payment_method || '—'}</span><span><small>Reference</small>{order.payment_reference || '—'}</span><span><small>Note</small>{order.notes || '—'}</span></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-plan-table">
          <div className="admin-plan-row header"><span>Product</span><span>Plan</span><span>Price</span><span>Active</span><span></span></div>
          {plans.map((plan) => (
            <div className="admin-plan-row" key={plan.id}>
              <span><strong>{plan.product_slug}</strong><small>{plan.currency}</small></span>
              <span>{plan.label}</span>
              <input type="number" min="0" step="0.01" value={plan.price ?? ''} placeholder="Quote" onChange={(e) => setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, price: e.target.value } : item))} />
              <label className="admin-check"><input type="checkbox" checked={Boolean(plan.active)} onChange={(e) => setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, active: e.target.checked } : item))} /><span>{plan.active ? 'Yes' : 'No'}</span></label>
              <button onClick={() => savePlan(plan)} disabled={savingId === plan.id}>{savingId === plan.id ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Save</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default AdminPanel
