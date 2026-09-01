import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react'
import { createOrder, supabaseConfigured } from '../lib/supabase'

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const itemSlug = (item) => item.slug || slugify(item.name)

const formatPlanPrice = (plan) => {
  if (!plan || plan.price === null) return 'Price coming soon'
  const min = Number(plan.price)
  const max = plan.price_max === null || plan.price_max === undefined ? min : Number(plan.price_max)
  return max > min
    ? `৳${min.toLocaleString('en-BD')}–৳${max.toLocaleString('en-BD')}`
    : `৳${min.toLocaleString('en-BD')}`
}

function CheckoutModal({ cart, plans, onClose, onSuccess }) {
  const [customer, setCustomer] = useState({ name: '', phone: '', paymentMethod: 'bKash', paymentReference: '', notes: '' })
  const [selectedPlans, setSelectedPlans] = useState(() => {
    const initial = {}
    cart.forEach((item) => {
      const plan = plans.find((candidate) => candidate.product_slug === itemSlug(item))
      if (plan) initial[itemSlug(item)] = plan.id
    })
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const pricedItems = useMemo(() => cart.map((item) => {
    const slug = itemSlug(item)
    const selectedId = selectedPlans[slug]
    const available = plans.filter((plan) => plan.product_slug === slug)
    const selected = available.find((plan) => plan.id === selectedId) || available[0]
    return { item, slug, selected, available }
  }), [cart, plans, selectedPlans])

  const subtotal = pricedItems.reduce((sum, row) => sum + (Number(row.selected?.price) || 0), 0)
  const hasMissingPrices = pricedItems.some((row) => row.selected && row.selected.price === null)
  const hasRangePrices = pricedItems.some((row) => {
    const min = Number(row.selected?.price || 0)
    const max = Number(row.selected?.price_max || min)
    return max > min
  })

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!supabaseConfigured) return setError('Store backend is not connected yet.')
    if (!customer.name || !customer.phone) return setError('Name and phone are required.')
    if (pricedItems.some((row) => !row.selected)) return setError('One or more products do not have an active plan yet.')
    setSubmitting(true)
    try {
      const data = await createOrder({
        customer_name: customer.name.trim(), phone: customer.phone.trim(), payment_method: customer.paymentMethod,
        payment_reference: customer.paymentReference.trim() || null, notes: customer.notes.trim() || null,
        items: pricedItems.map((row) => ({ plan_id: row.selected.id, quantity: 1 })),
      })
      setResult(data)
      onSuccess?.(data)
    } catch (err) { setError(err.message || 'Could not create the order.') } finally { setSubmitting(false) }
  }

  if (result) return <div className="commerce-overlay" role="dialog" aria-modal="true"><div className="commerce-modal success-modal"><CheckCircle2 size={46}/><small>Order received</small><h2>{result.order_code}</h2><p>{result.status === 'quote_requested' ? 'Your order was received. Final price will be confirmed before payment/activation.' : 'Your order has been submitted successfully. Save this order code for support.'}</p><div className="order-summary-box"><span>Status <strong>{String(result.status).replaceAll('_',' ')}</strong></span><span>{result.status === 'quote_requested' ? 'Minimum total' : 'Total'} <strong>{result.currency} {Number(result.subtotal || 0).toFixed(2)}</strong></span></div><button className="primary-button full" onClick={onClose}>Done</button></div></div>

  return <div className="commerce-overlay" role="dialog" aria-modal="true"><div className="commerce-modal checkout-modal"><div className="commerce-modal-head"><div><small>No login required</small><h2>Checkout</h2></div><button onClick={onClose} aria-label="Close checkout"><X/></button></div><form onSubmit={submit}><div className="checkout-layout"><div className="checkout-form-panel"><h3>Customer information</h3><label><span>Full name</span><input value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} placeholder="Your name"/></label><label><span>Phone / WhatsApp</span><input value={customer.phone} onChange={(e)=>setCustomer({...customer,phone:e.target.value})} placeholder="01XXXXXXXXX"/></label><h3>Payment information</h3><div className="field-grid two"><label><span>Payment method</span><select value={customer.paymentMethod} onChange={(e)=>setCustomer({...customer,paymentMethod:e.target.value})}><option>bKash</option><option>Nagad</option><option>Bank transfer</option><option>Other</option></select></label><label><span>Transaction / reference ID</span><input value={customer.paymentReference} onChange={(e)=>setCustomer({...customer,paymentReference:e.target.value})} placeholder="Optional until payment"/></label></div><label><span>Order note</span><textarea rows="3" value={customer.notes} onChange={(e)=>setCustomer({...customer,notes:e.target.value})} placeholder="Account email or setup note if needed"/></label><div className="policy-note"><ShieldCheck size={18}/><span>No customer login or account creation is required for checkout.</span></div>{error&&<div className="form-error">{error}</div>}</div><div className="checkout-summary-panel"><h3>Order summary</h3><div className="checkout-items">{pricedItems.map(({item,slug,selected,available})=><div className="checkout-item" key={slug}><div><strong>{item.name}</strong><small>{item.category}</small></div>{available.length>0?<select value={selected?.id||''} onChange={(e)=>setSelectedPlans({...selectedPlans,[slug]:e.target.value})}>{available.map((plan)=><option key={plan.id} value={plan.id}>{plan.label} · {formatPlanPrice(plan)}</option>)}</select>:<small className="missing-plan">No active plan</small>}</div>)}</div><div className="checkout-total"><span>{hasRangePrices?'Minimum subtotal':'Total'}</span><strong>৳{subtotal.toLocaleString('en-BD')}</strong></div>{hasRangePrices&&<p className="quote-note">A selected plan has a price range. Final amount will be confirmed before payment or activation.</p>}{hasMissingPrices&&<p className="quote-note">One or more selected plans do not have a selling price yet. Final price will be confirmed before fulfillment.</p>}<button className="primary-button full" type="submit" disabled={submitting||cart.length===0}>{submitting?<><Loader2 className="spin" size={18}/> Creating order...</>:<>Place order <ArrowRight size={18}/></>}</button></div></div></form></div></div>
}

export default CheckoutModal
