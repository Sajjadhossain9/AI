import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { lookupOrder, supabaseConfigured } from '../lib/supabase'

function OrderLookup() {
  const [orderCode, setOrderCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setOrder(null)

    if (!supabaseConfigured) {
      setError('Order tracking will activate after Supabase is connected.')
      return
    }

    setLoading(true)
    try {
      const data = await lookupOrder(orderCode.trim().toUpperCase(), email.trim().toLowerCase())
      if (!data) setError('No matching order found.')
      else setOrder(data)
    } catch (err) {
      setError(err.message || 'Could not find the order.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section-wrap section" id="track-order">
      <div className="tracking-card">
        <div className="section-heading">
          <div className="eyebrow"><span></span> Track your order</div>
          <h2>Check order status anytime.</h2>
          <p>Use the order code and the same email address used at checkout.</p>
        </div>
        <form className="tracking-form" onSubmit={submit}>
          <label><span>Order code</span><input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="AIMY-XXXXXX" /></label>
          <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? <><Loader2 className="spin" size={18} /> Checking...</> : <><Search size={18} /> Check status</>}</button>
        </form>
        {error && <div className="form-error tracking-result">{error}</div>}
        {order && (
          <div className="tracking-result success">
            <div><small>Order</small><strong>{order.order_code}</strong></div>
            <div><small>Status</small><strong>{String(order.status).replaceAll('_', ' ')}</strong></div>
            <div><small>Total</small><strong>{order.currency} {Number(order.subtotal || 0).toFixed(2)}</strong></div>
            <div><small>Updated</small><strong>{new Date(order.updated_at || order.created_at).toLocaleString()}</strong></div>
          </div>
        )}
      </div>
    </section>
  )
}

export default OrderLookup
