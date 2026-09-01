import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Code2,
  GraduationCap,
  Headphones,
  Menu,
  Palette,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react'
import { categories, products } from './data/products'
import CheckoutModal from './components/CheckoutModal'
import { fetchPlans, supabaseConfigured } from './lib/supabase'

const categoryIcons = {
  'AI Assistants': Bot,
  'Writing & Academic': BookOpen,
  'SEO & Marketing': BarChart3,
  'Design & Creative': Palette,
  'Developer Tools': Code2,
  'Video & Voice': Play,
  Productivity: Zap,
  Education: GraduationCap,
  Research: Search,
  Entertainment: Star,
}

const featuredNames = ['ChatGPT', 'Claude', 'Turnitin', 'Semrush', 'Canva Pro', 'GitHub Copilot', 'YouTube Premium', 'SciSpace']
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function App() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [plans, setPlans] = useState([])
  const [planError, setPlanError] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return
    fetchPlans().then(setPlans).catch((error) => setPlanError(error.message || 'Could not load prices.'))
  }, [])

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatch = activeCategory === 'All' || product.category === activeCategory
      const queryMatch = !normalized || [product.name, product.category, product.description, product.tag]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
      return categoryMatch && queryMatch
    })
  }, [activeCategory, query])

  const visibleProducts = showAll || activeCategory !== 'All' || query
    ? filteredProducts
    : filteredProducts.filter((product) => featuredNames.includes(product.name))

  const productPlans = (product) => plans.filter((plan) => plan.product_slug === slugify(product.name) && plan.active)

  const priceLabel = (product) => {
    const available = productPlans(product)
    const priced = available.filter((plan) => plan.price !== null).map((plan) => Number(plan.price))
    if (priced.length) return `৳${Math.min(...priced).toLocaleString('en-BD')}`
    if (available.length) return 'Price coming soon'
    return 'Price pending'
  }

  const addToCart = (product, open = true) => {
    setCart((current) => current.some((item) => item.name === product.name) ? current : [...current, product])
    if (open) setCartOpen(true)
  }

  const buyNow = (product) => {
    setCart([product])
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  const removeFromCart = (name) => setCart((current) => current.filter((item) => item.name !== name))

  const chooseCategory = (category) => {
    setActiveCategory(category)
    setShowAll(true)
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
  }

  const beginCheckout = () => {
    if (!cart.length) return
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  return (
    <div className="app-shell">
      <div className="announcement">
        <Sparkles size={14} />
        <span>Premium digital tools at clear prices.</span>
        <a href="#products">Shop now <ArrowRight size={13} /></a>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="AIMY home"><span className="brand-mark"><Sparkles size={19} /></span><span>AIMY</span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#products">Products</a>
          <a href="#categories">Categories</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label="Open cart">
            <ShoppingBag size={19} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}
          </button>
          <a className="primary-button compact" href="#products">Buy tools</a>
          <button className="menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu">{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {mobileOpen && (
        <nav className="mobile-nav">
          <a onClick={() => setMobileOpen(false)} href="#products">Products</a>
          <a onClick={() => setMobileOpen(false)} href="#categories">Categories</a>
          <a onClick={() => setMobileOpen(false)} href="#how-it-works">How it works</a>
          <a onClick={() => setMobileOpen(false)} href="#faq">FAQ</a>
        </nav>
      )}

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span></span> AI • Education • Creative • Productivity</div>
            <h1>Premium digital tools, <em>simple to buy.</em></h1>
            <p>Choose your software, see the price, tap Buy Now or add multiple tools to your cart, then complete one simple checkout.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#products">Browse products <ArrowRight size={18} /></a>
              <button className="ghost-button" onClick={() => setCartOpen(true)}>Open cart</button>
            </div>
            <div className="hero-proof"><div className="avatars"><span>AI</span><span>SEO</span><span>EDU</span></div><div><strong>30+ premium tools</strong><small>No customer account or login required</small></div></div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="orb orb-one"></div><div className="orb orb-two"></div>
            <div className="visual-card main-card">
              <div className="visual-card-head"><span>Popular right now</span><Sparkles size={17} /></div>
              {['ChatGPT', 'Canva Pro', 'Semrush', 'Turnitin'].map((name, index) => {
                const item = products.find((product) => product.name === name)
                return <div className="mini-product" key={name}><span className={`mini-logo tone-${index + 1}`}>{item.initials}</span><div><strong>{name}</strong><small>{item.category}</small></div><Check size={17} /></div>
              })}
            </div>
            <div className="floating-card rating-card"><Star size={18} fill="currentColor" /><div><strong>Buy instantly</strong><small>No sign-up</small></div></div>
            <div className="floating-card support-card"><Headphones size={18} /><div><strong>Support</strong><small>Before & after order</small></div></div>
          </div>
        </section>

        <section className="brand-strip"><span>ChatGPT</span><span>Claude</span><span>Gemini</span><span>Canva</span><span>Semrush</span><span>Coursera</span><span>Copilot</span><span>Perplexity</span></section>

        <section className="section-wrap section" id="categories">
          <div className="section-heading centered"><div className="eyebrow"><span></span> Shop by category</div><h2>Everything you need to learn, create and grow.</h2><p>Select a category to find the right tool quickly.</p></div>
          <div className="category-grid">
            {categories.filter((category) => category !== 'All').map((category) => {
              const Icon = categoryIcons[category] || Sparkles
              const count = products.filter((product) => product.category === category).length
              return <button className="category-card" key={category} onClick={() => chooseCategory(category)}><span className="category-icon"><Icon size={21} /></span><span><strong>{category}</strong><small>{count} tools</small></span><ArrowRight size={18} /></button>
            })}
          </div>
        </section>

        <section className="products-section section" id="products">
          <div className="section-wrap">
            <div className="section-heading row-heading">
              <div><div className="eyebrow"><span></span> Product catalog</div><h2>{activeCategory === 'All' ? 'Featured tools' : activeCategory}</h2></div>
              <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(true) }} placeholder="Search tools..." /></div>
            </div>
            {planError && <div className="form-error">Price loading error: {planError}</div>}
            <div className="filter-row">{categories.map((category) => <button className={activeCategory === category ? 'filter-chip active' : 'filter-chip'} key={category} onClick={() => { setActiveCategory(category); if (category !== 'All') setShowAll(true) }}>{category}</button>)}</div>

            {visibleProducts.length > 0 ? (
              <div className="product-grid">
                {visibleProducts.map((product, index) => (
                  <article className="product-card" key={product.name}>
                    <div className="product-top"><span className={`product-logo tone-${(index % 5) + 1}`}>{product.initials}</span><span className="tag">{product.tag}</span></div>
                    <div className="product-meta">{product.category}</div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="store-price"><span>Starting from</span><strong>{priceLabel(product)}</strong></div>
                    <div className="store-actions">
                      <button className="buy-now-button" onClick={() => buyNow(product)}>Buy Now <ArrowRight size={16} /></button>
                      <button className="add-cart-button" onClick={() => addToCart(product)}><ShoppingBag size={16} /> {cart.some((item) => item.name === product.name) ? 'Added' : 'Add to Cart'}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state"><Search size={28} /><h3>No tools found</h3><p>Try another keyword or category.</p></div>}

            {activeCategory === 'All' && !query && !showAll && <div className="center-action"><button className="ghost-button" onClick={() => setShowAll(true)}>View all {products.length} tools <ArrowRight size={17} /></button></div>}
          </div>
        </section>

        <section className="section-wrap section" id="how-it-works">
          <div className="section-heading centered narrow"><div className="eyebrow"><span></span> Simple checkout</div><h2>No login. Just choose, pay and order.</h2><p>The storefront is intentionally simple for buyers.</p></div>
          <div className="feature-grid">
            <div className="feature-card"><span><ShoppingBag /></span><h3>1. Choose product</h3><p>Tap Buy Now for one tool or Add to Cart for multiple tools.</p></div>
            <div className="feature-card"><span><Zap /></span><h3>2. Choose plan</h3><p>Select the available duration and see the exact total in checkout.</p></div>
            <div className="feature-card"><span><ShieldCheck /></span><h3>3. Submit order</h3><p>Enter your name, phone and payment reference. No account creation required.</p></div>
          </div>
        </section>

        <section className="section-wrap section" id="faq">
          <div className="faq-layout"><div className="section-heading"><div className="eyebrow"><span></span> FAQ</div><h2>Questions, answered.</h2><p>Quick information before buying.</p></div><div className="faq-list">
            <details open><summary>Do I need an account?<ChevronDown size={18} /></summary><p>No. Customers can use Buy Now or Cart and submit an order without signing up or logging in.</p></details>
            <details><summary>Where do prices come from?<ChevronDown size={18} /></summary><p>Prices are stored in the shop database. When a price is set, it automatically appears on the product card and checkout.</p></details>
            <details><summary>Can I buy multiple tools together?<ChevronDown size={18} /></summary><p>Yes. Add multiple products to the cart and complete them in one checkout.</p></details>
            <details><summary>How is payment verified?<ChevronDown size={18} /></summary><p>Customer can submit the payment method and transaction/reference ID with the order.</p></details>
          </div></div>
        </section>

        <section className="section-wrap final-cta"><div><span className="eyebrow light"><span></span> Build your toolkit</span><h2>One place. More ways to create.</h2><p>Explore premium tools for study, work, coding, design, research and growth.</p></div><a className="light-button" href="#products">Shop now <ArrowRight size={18} /></a></section>
      </main>

      <footer>
        <div className="section-wrap footer-grid"><div><a className="brand footer-brand" href="#top"><span className="brand-mark"><Sparkles size={19} /></span><span>AIMY</span></a><p>Premium digital tools for students, creators, developers and businesses.</p></div><div><strong>Explore</strong><a href="#products">Products</a><a href="#categories">Categories</a><a href="#how-it-works">How it works</a></div><div><strong>Categories</strong><a href="#products">AI tools</a><a href="#products">Academic tools</a><a href="#products">SEO tools</a></div><div><strong>Support</strong><a href="#faq">FAQ</a><a href="#how-it-works">Buying guide</a></div></div>
        <div className="section-wrap footer-bottom"><span>© 2026 AIMY. All rights reserved.</span><span>Independent digital tools marketplace. Product names belong to their respective owners.</span></div>
      </footer>

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}></div>}
      <aside className={cartOpen ? 'cart-drawer open' : 'cart-drawer'} aria-hidden={!cartOpen}>
        <div className="drawer-head"><div><small>Your selection</small><h3>Cart ({cart.length})</h3></div><button onClick={() => setCartOpen(false)}><X /></button></div>
        <div className="drawer-items">
          {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={30} /><h4>Your cart is empty</h4><p>Add a tool to start your order.</p></div> : cart.map((item, index) => (
            <div className="cart-item" key={item.name}>
              <span className={`mini-logo tone-${(index % 5) + 1}`}>{item.initials}</span>
              <div><strong>{item.name}</strong><small>{priceLabel(item)}</small></div>
              <button onClick={() => removeFromCart(item.name)}><X size={16} /></button>
            </div>
          ))}
        </div>
        <div className="drawer-footer"><div className="checkout-note"><ShieldCheck size={17} /><span>No login required. Choose plan and checkout.</span></div><button className="primary-button full" disabled={cart.length === 0} onClick={beginCheckout}>Checkout <ArrowRight size={18} /></button></div>
      </aside>

      {checkoutOpen && <CheckoutModal cart={cart} plans={plans} onClose={() => setCheckoutOpen(false)} onSuccess={() => setCart([])} />}
    </div>
  )
}

export default App
