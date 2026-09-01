import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import {
  adminArchiveProduct,
  adminCatalog,
  adminChangePassword,
  adminInitialize,
  adminLogin,
  adminLogout,
  adminNeedsSetup,
  adminSavePlan,
  adminSaveProduct,
  adminValidate,
} from '../lib/supabase'

const TOKEN_KEY = 'aimy_admin_token'
const emptyProduct = () => ({
  id: '',
  slug: '',
  name: '',
  category: 'AI Assistants',
  description: '',
  initials: '',
  tag: '',
  status: 'available',
  active: true,
  featured: false,
  sort_order: 100,
  plans: [{ id: '', label: '1 Month', duration_days: 30, price: '', price_max: '', compare_at_price: '', currency: 'BDT', active: true }],
})

const moneyValue = (value) => value === null || value === undefined ? '' : value

function AdminPanel() {
  const [mode, setMode] = useState('loading')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [catalog, setCatalog] = useState([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordPanel, setPasswordPanel] = useState(false)

  const loadCatalog = async (activeToken = token) => {
    if (!activeToken) return
    setLoading(true)
    setError('')
    try {
      const rows = await adminCatalog(activeToken)
      setCatalog(rows)
    } catch (err) {
      setError(err.message || 'Could not load products.')
      if (/expired/i.test(err.message || '')) logout(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const boot = async () => {
      try {
        const saved = sessionStorage.getItem(TOKEN_KEY) || ''
        if (saved && await adminValidate(saved)) {
          setToken(saved)
          setMode('dashboard')
          const rows = await adminCatalog(saved)
          setCatalog(rows)
          return
        }
        sessionStorage.removeItem(TOKEN_KEY)
        setMode(await adminNeedsSetup() ? 'setup' : 'login')
      } catch (err) {
        setError(err.message || 'Could not initialize admin portal.')
        setMode('login')
      }
    }
    boot()
  }, [])

  const authenticate = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'setup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'setup') await adminInitialize(password)
      const result = await adminLogin(password)
      sessionStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
      setPassword('')
      setConfirmPassword('')
      setMode('dashboard')
      setCatalog(await adminCatalog(result.token))
      setNotice(mode === 'setup' ? 'Admin password created. Portal is ready.' : 'Signed in.')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  const logout = async (callServer = true) => {
    if (callServer && token) await adminLogout(token)
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setCatalog([])
    setEditing(null)
    setMode('login')
  }

  const editProduct = (product) => {
    setEditing({
      ...product,
      plans: (product.plans || []).map((plan) => ({
        ...plan,
        price: moneyValue(plan.price),
        price_max: moneyValue(plan.price_max),
        compare_at_price: moneyValue(plan.compare_at_price),
      })),
    })
    setError('')
    setNotice('')
  }

  const addPlan = () => {
    const hasYear = editing.plans.some((plan) => plan.label === '1 Year')
    const label = hasYear ? 'Custom Plan' : '1 Year'
    setEditing({
      ...editing,
      plans: [...editing.plans, { id: '', label, duration_days: hasYear ? 30 : 365, price: '', price_max: '', compare_at_price: '', currency: 'BDT', active: true }],
    })
  }

  const updatePlan = (index, key, value) => {
    setEditing({ ...editing, plans: editing.plans.map((plan, i) => i === index ? { ...plan, [key]: value } : plan) })
  }

  const saveEverything = async () => {
    if (!editing?.name.trim()) {
      setError('Product name is required.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const saved = await adminSaveProduct(token, {
        id: editing.id || null,
        slug: editing.slug || null,
        name: editing.name.trim(),
        category: editing.category.trim(),
        description: editing.description,
        initials: editing.initials,
        tag: editing.tag,
        status: editing.status,
        active: Boolean(editing.active),
        featured: Boolean(editing.featured),
        sort_order: Number(editing.sort_order) || 100,
      })

      for (const plan of editing.plans) {
        await adminSavePlan(token, {
          id: plan.id || null,
          product_slug: saved.slug,
          label: plan.label,
          duration_days: Number(plan.duration_days) || 30,
          price: plan.price === '' ? null : Number(plan.price),
          price_max: plan.price_max === '' ? null : Number(plan.price_max),
          compare_at_price: plan.compare_at_price === '' ? null : Number(plan.compare_at_price),
          currency: plan.currency || 'BDT',
          active: Boolean(plan.active),
        })
      }

      const rows = await adminCatalog(token)
      setCatalog(rows)
      const refreshed = rows.find((item) => item.id === saved.id)
      if (refreshed) editProduct(refreshed)
      setNotice('Saved. Storefront pricing and product status are updated.')
    } catch (err) {
      setError(err.message || 'Could not save product.')
    } finally {
      setLoading(false)
    }
  }

  const archive = async () => {
    if (!editing?.id || !window.confirm(`Hide ${editing.name} from the storefront?`)) return
    setLoading(true)
    try {
      await adminArchiveProduct(token, editing.id)
      setEditing(null)
      await loadCatalog()
      setNotice('Product hidden from storefront.')
    } catch (err) {
      setError(err.message || 'Could not hide product.')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setError('')
    if (passwordForm.next !== passwordForm.confirm) {
      setError('New passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await adminChangePassword(token, passwordForm.current, passwordForm.next)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setPasswordPanel(false)
      setNotice('Admin password changed.')
    } catch (err) {
      setError(err.message || 'Could not change password.')
    } finally {
      setLoading(false)
    }
  }

  const categories = useMemo(() => [...new Set(catalog.map((item) => item.category).filter(Boolean))], [catalog])
  const visibleCatalog = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((item) => [item.name, item.category, item.tag, item.status].join(' ').toLowerCase().includes(q))
  }, [catalog, query])

  if (mode === 'loading') {
    return <main className="admin-portal auth-screen"><Loader2 className="spin" size={34} /><p>Loading admin portal...</p></main>
  }

  if (mode === 'setup' || mode === 'login') {
    return (
      <main className="admin-portal auth-screen">
        <a className="admin-store-link" href="/"><ArrowLeft size={17} /> Storefront</a>
        <form className="admin-auth-card" onSubmit={authenticate}>
          <div className="admin-auth-icon"><ShieldCheck /></div>
          <small>AIMY CONTROL PANEL</small>
          <h1>{mode === 'setup' ? 'Create admin password' : 'Admin portal'}</h1>
          <p>{mode === 'setup' ? 'One-time setup. Choose a private password for this portal. No email account is required.' : 'Enter your private admin password.'}</p>
          <label><span>{mode === 'setup' ? 'New password' : 'Admin password'}</span><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {mode === 'setup' && <label><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>}
          {error && <div className="admin-message error">{error}</div>}
          <button className="admin-primary" disabled={loading}>{loading ? <><Loader2 className="spin" size={17} /> Please wait...</> : mode === 'setup' ? 'Create admin portal' : 'Sign in'}</button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-portal">
      <header className="admin-topbar">
        <div><a className="admin-store-link" href="/"><ArrowLeft size={17} /> Storefront</a><h1>AIMY Admin</h1><p>Products, pricing, availability and offers.</p></div>
        <div className="admin-top-actions">
          <button onClick={() => loadCatalog()}><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => setPasswordPanel(!passwordPanel)}><KeyRound size={16} /> Password</button>
          <button onClick={() => logout()}><LogOut size={16} /> Logout</button>
        </div>
      </header>

      {notice && <div className="admin-message success"><CheckCircle2 size={17} /> {notice}</div>}
      {error && <div className="admin-message error">{error}</div>}

      {passwordPanel && <form className="password-panel" onSubmit={changePassword}>
        <strong>Change admin password</strong>
        <input type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
        <input type="password" placeholder="New password (10+ characters)" value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} required />
        <input type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
        <button className="admin-primary" disabled={loading}><Save size={16} /> Update password</button>
      </form>}

      <section className="admin-workspace">
        <aside className="admin-product-sidebar">
          <div className="sidebar-head"><div><small>CATALOG</small><strong>{catalog.length} products</strong></div><button className="icon-action primary" onClick={() => setEditing(emptyProduct())} title="Add product"><PackagePlus size={19} /></button></div>
          <input className="admin-search" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="admin-product-list">
            {visibleCatalog.map((product) => <button key={product.id} className={editing?.id === product.id ? 'admin-product-item active' : 'admin-product-item'} onClick={() => editProduct(product)}>
              <span className="admin-product-initials">{product.initials}</span>
              <span><strong>{product.name}</strong><small>{product.category}</small></span>
              <em className={`status-dot ${product.status}`}>{product.status === 'stock_out' ? 'Stock out' : product.status}</em>
            </button>)}
          </div>
          <button className="add-product-wide" onClick={() => setEditing(emptyProduct())}><Plus size={17} /> Add new product</button>
        </aside>

        <section className="admin-editor">
          {!editing ? <div className="editor-empty"><PackagePlus size={42} /><h2>Select a product</h2><p>Edit an existing product or add a new one.</p><button className="admin-primary" onClick={() => setEditing(emptyProduct())}><Plus size={17} /> Add product</button></div> : <>
            <div className="editor-header"><div><small>{editing.id ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</small><h2>{editing.name || 'Untitled product'}</h2></div><button className="icon-action" onClick={() => setEditing(null)}><X size={19} /></button></div>

            <div className="editor-section">
              <h3>Product details</h3>
              <div className="admin-form-grid two">
                <label><span>Product name</span><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="ChatGPT Plus" /></label>
                <label><span>Category</span><input list="category-options" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /><datalist id="category-options">{categories.map((category) => <option value={category} key={category} />)}</datalist></label>
                <label><span>Short initials</span><input value={editing.initials} onChange={(e) => setEditing({ ...editing, initials: e.target.value })} placeholder="GPT" maxLength="4" /></label>
                <label><span>Custom tag</span><input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="Popular / Best Seller" /></label>
              </div>
              <label><span>Description</span><textarea rows="3" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
              <div className="admin-form-grid three">
                <label><span>Availability / tag</span><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}><option value="available">Available</option><option value="stock_out">Stock Out</option><option value="offer">Offer</option></select></label>
                <label><span>Sort order</span><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></label>
                <div className="toggle-group"><label><input type="checkbox" checked={Boolean(editing.active)} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /><span>Visible on store</span></label><label><input type="checkbox" checked={Boolean(editing.featured)} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /><span>Featured</span></label></div>
              </div>
            </div>

            <div className="editor-section">
              <div className="section-title-row"><div><h3>Plans & pricing</h3><p>Enter any BDT amount manually. Max price creates a range; old price can show an offer reference.</p></div><button onClick={addPlan}><Plus size={16} /> Add plan</button></div>
              <div className="plan-editor-list">
                {editing.plans.map((plan, index) => <div className="plan-editor-card" key={plan.id || `new-${index}`}>
                  <div className="plan-card-title"><Tag size={17} /><strong>{plan.label || 'New plan'}</strong><label><input type="checkbox" checked={Boolean(plan.active)} onChange={(e) => updatePlan(index, 'active', e.target.checked)} /> Active</label></div>
                  <div className="admin-form-grid five">
                    <label><span>Plan name</span><input value={plan.label} onChange={(e) => updatePlan(index, 'label', e.target.value)} placeholder="1 Month" /></label>
                    <label><span>Days</span><input type="number" min="1" value={plan.duration_days} onChange={(e) => updatePlan(index, 'duration_days', e.target.value)} /></label>
                    <label><span>Price ৳</span><input type="number" min="0" value={plan.price} onChange={(e) => updatePlan(index, 'price', e.target.value)} placeholder="1800" /></label>
                    <label><span>Max price ৳</span><input type="number" min="0" value={plan.price_max} onChange={(e) => updatePlan(index, 'price_max', e.target.value)} placeholder="3000" /></label>
                    <label><span>Old price ৳</span><input type="number" min="0" value={plan.compare_at_price} onChange={(e) => updatePlan(index, 'compare_at_price', e.target.value)} placeholder="Optional" /></label>
                  </div>
                </div>)}
              </div>
            </div>

            <div className="editor-actions">
              {editing.id && <button className="danger-button" onClick={archive} disabled={loading}><Trash2 size={16} /> Hide product</button>}
              <button className="admin-primary save-all" onClick={saveEverything} disabled={loading}>{loading ? <Loader2 className="spin" size={17} /> : <Save size={17} />} Save product & pricing</button>
            </div>
          </>}
        </section>
      </section>
    </main>
  )
}

export default AdminPanel
