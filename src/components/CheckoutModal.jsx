import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react'
import { createOrder, supabaseConfigured } from '../lib/supabase'

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function CheckoutModal({ cart, plans, onClose, onSuccess }) {
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'Manual payment',
    paymentReference: '',
    notes: '',
  })
  const [selectedPlans, setSelectedPlans] = useState(() => {
    const initial = {}
    cart.forEach((item) => {
      const plan = plans.find((candidate) => candidate.product_slug === slugify(item.name))
      if (plan) initial[item.name] = plan.id
    })
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const pricedItems = useMemo(() => cart.map((item) => {
    const selectedId = selectedPlans[item.name]
    const available = plans.filter((plan) => plan.product_slug === slugify(item.name))
    const selected = available.find((plan) => plan.id === selectedId) || available[0]
    return { item, selected, available }
  }), [cart, plans, selectedPlans])

  const subtotal = pricedItems.reduce((sum, row) => sum + (Number(row.selected?.price) || 0), 0)
  const hasQuoteItems = pricedItems.some((row) => row.selected && row.selected.price === null)

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!supabaseConfigured) {
      setError('Supabase connection is not configured yet. Add the environment variables first.')
      return
    }
    if (!customer.name || !customer.email || !customer.phone) {
      setError('Name, email and phone are required.')
      return
    }
    if (pricedItems.some((row) => !row.selected)) {
      setError('One or more products do not have an active plan yet.')
      return
    }

    setSubmitting(true)
    try {
      const data = await createOrder({
        customer_name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
        payment_method: customer.paymentMethod,
        payment_reference: customer.paymentReference.trim() || null,
        notes: customer.notes.trim() || null,
        items: pricedItems.map((row) => ({ plan_id: row.selected.id, quantity: 1 })),
      })
      setResult(data)
      onSuccess?.(data)
    } catch (err) {
      setError(err.message || 'Could not create the order.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="commerce-overlay" role="dialog" aria-modal="true">
        <div className="commerce-modal success-modal">
          <CheckCircle2 size={46} />
          <small>Order received</small>
          <h2>{result.order_code}</h2>
          <p>{result.status === 'quote_requested' ? 'Your order needs a price quote. You can use the order code to check its status.' : 'Your order has been created. Keep this code to check the status later.'}</p>
          <div className="order-summary-box">
            <span>Status <strong>{String(result.status).replaceAll('_', ' ')}</strong></span>
            <span>Total <strong>{result.currency} {Number(result.subtotal || 0).toFixed(2)}</strong></span>
          </div>
          <button className="primary-button full" onClick={onClose}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="commerce-overlay" role="dialog" aria-modal="true">
      <div className="commerce-modal checkout-modal">
        <div className="commerce-modal-head">
          <div><small>Secure order form</small><h2>Checkout</h2></div>
          <button onClick={onClose} aria-label="Close checkout"><X /></button>
        </div>

        <form onSubmit={submit}>
          <div className="checkout-layout">
            <div className="checkout-form-panel">
              <h3>Customer information</h3>
              <div className="field-grid two">
                <label><span>Full name</span><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Your name" /></label>
                <label><span>Email</span><input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="you@example.com" /></label>
              </div>
              <label><span>Phone</span><input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" /></label>

              <h3>Payment information</h3>
              <div className="field-grid two">
                <label><span>Payment method</span><select value={customer.paymentMethod} onChange={(e) => setCustomer({ ...customer, paymentMethod: e.target.value })}><option>Manual payment</option><option>Bank transfer</option><option>Other</option></select></label>
                <label><span>Transaction / reference</span><input value={customer.paymentReference} onChange={(e) => setCustomer({ ...customer, paymentReference: e.target.value })} placeholder="Optional for quote requests" /></label>
              </div>
              <label><span>Order note</span><textarea rows="3" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="Account email, preferred setup method, or other note" /></label>
              <div className="policy-note"><ShieldCheck size={18} /><span>Only provider-permitted reseller, affiliate, business, API or customer-owned-account activation methods should be fulfilled.</span></div>
              {error && <div className="form-error">{error}</div>}
            </div>

            <div className="checkout-summary-panel">
              <h3>Order summary</h3>
              <div className="checkout-items">
                {pricedItems.map(({ item, selected, available }) => (
                  <div className="checkout-item" key={item.name}>
                    <div><strong>{item.name}</strong><small>{item.category}</small></div>
                    {available.length > 0 ? (
                      <select value={selected?.id || ''} onChange={(e) => setSelectedPlans({ ...selectedPlans, [item.name]: e.target.value })}>
                        {available.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}{plan.price === null ? ' · Quote' : ` · ${plan.currency} ${Number(plan.price).toFixed(2)}`}</option>)}
                      </select>
                    ) : <small className="missing-plan">No active plan</small>}
                  </div>
                ))}
              </div>
              <div className="checkout-total"><span>{hasQuoteItems ? 'Priced subtotal' : 'Subtotal'}</span><strong>BDT {subtotal.toFixed(2)}</strong></div>
              {hasQuoteItems && <p className="quote-note">One or more items are set to “Quote”. Final amount will be confirmed before fulfillment.</p>}
              <button className="primary-button full" type="submit" disabled={submitting || cart.length === 0}>{submitting ? <><Loader2 className="spin" size={18} /> Creating order...</> : <>Place order <ArrowRight size={18} /></>}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CheckoutModal
