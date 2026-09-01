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
import { products as fallbackProducts } from './data/products'
import CheckoutModal from './components/CheckoutModal'
import { fetchPlans, fetchProducts, supabaseConfigured } from './lib/supabase'

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

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const fallback = fallbackProducts.map((product, index) => ({ ...product, slug: slugify(product.name), status: 'available', active: true, featured: index < 8, sort_order: index }))

function App() {
  const [products, setProducts] = useState(fallback)
  const [plans, setPlans] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return
    Promise.all([fetchProducts(), fetchPlans()])
      .then(([productRows, planRows]) => {
        if (productRows.length) setProducts(productRows)
        setPlans(planRows)
      })
      .catch((error) => setDataError(error.message || 'Could not load store data.'))
  }, [])

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category).filter(Boolean))], [products])

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatch = activeCategory === 'All' || product.category === activeCategory
      const queryMatch = !normalized || [product.name, product.category, product.description, product.tag, product.status]
        .join(' ').toLowerCase().includes(normalized)
      return categoryMatch && queryMatch
    })
  }, [products, activeCategory, query])

  const visibleProducts = useMemo(() => {
    if (showAll || activeCategory !== 'All' || query) return filteredProducts
    const featured = filteredProducts.filter((product) => product.featured)
    return (featured.length ? featured : filteredProducts).slice(0, 8)
  }, [filteredProducts, showAll, activeCategory, query])

  const productPlans = (product) => plans.filter((plan) => plan.product_slug === product.slug && plan.active)

  const priceLabel = (product) => {
    const available = productPlans(product)
    const priced = available.filter((plan) => plan.price !== null && plan.price !== undefined)
    if (!priced.length) return available.length ? 'Price coming soon' : 'Price pending'
    const lowest = [...priced].sort((a, b) => Number(a.price) - Number(b.price))[0]
    if (lowest.price_max !== null && lowest.price_max !== undefined && Number(lowest.price_max) > Number(lowest.price)) {
      return `৳${Number(lowest.price).toLocaleString('en-BD')}–৳${Number(lowest.price_max).toLocaleString('en-BD')}`
    }
    return `৳${Number(lowest.price).toLocaleString('en-BD')}`
  }

  const statusLabel = (product) => product.status === 'stock_out' ? 'Stock Out' : product.status === 'offer' ? 'Offer' : product.tag || 'Available'

  const addToCart = (product, open = true) => {
    if (product.status === 'stock_out') return
    setCart((current) => current.some((item) => item.id === product.id || item.slug === product.slug) ? current : [...current, product])
    if (open) setCartOpen(true)
  }

  const buyNow = (product) => {
    if (product.status === 'stock_out') return
    setCart([product])
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  const removeFromCart = (slug) => setCart((current) => current.filter((item) => item.slug !== slug))
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
      <div className="announcement"><Sparkles size={14} /><span>Premium digital tools at clear prices.</span><a href="#products">Shop now <ArrowRight size={13} /></a></div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="AIMY home"><span className="brand-mark"><Sparkles size={19} /></span><span>AIMY</span></a>
        <nav className="desktop-nav"><a href="#products">Products</a><a href="#categories">Categories</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a></nav>
        <div className="header-actions">
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}</button>
          <a className="primary-button compact" href="#products">Buy tools</a>
          <button className="menu-button" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {mobileOpen && <nav className="mobile-nav"><a onClick={() => setMobileOpen(false)} href="#products">Products</a><a onClick={() => setMobileOpen(false)} href="#categories">Categories</a><a onClick={() => setMobileOpen(false)} href="#how-it-works">How it works</a><a onClick={() => setMobileOpen(false)} href="#faq">FAQ</a></nav>}

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span></span> AI • Education • Creative • Productivity</div>
            <h1>Premium digital tools, <em>simple to buy.</em></h1>
            <p>Choose your software, see the current price, tap Buy Now or add multiple tools to your cart, then complete one simple checkout.</p>
            <div className="hero-actions"><a className="primary-button" href="#products">Browse products <ArrowRight size={18} /></a><button className="ghost-button" onClick={() => setCartOpen(true)}>Open cart</button></div>
            <div className="hero-proof"><div className="avatars"><span>AI</span><span>SEO</span><span>EDU</span></div><div><strong>{products.length}+ premium tools</strong><small>No customer account or login required</small></div></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orb orb-one"></div><div className="orb orb-two"></div>
            <div className="visual-card main-card"><div className="visual-card-head"><span>Popular right now</span><Sparkles size={17} /></div>{products.slice(0,4).map((item,index)=><div className="mini-product" key={item.slug}><span className={`mini-logo tone-${index+1}`}>{item.initials}</span><div><strong>{item.name}</strong><small>{priceLabel(item)}</small></div><Check size={17}/></div>)}</div>
            <div className="floating-card rating-card"><Star size={18} fill="currentColor" /><div><strong>Buy instantly</strong><small>No sign-up</small></div></div>
            <div className="floating-card support-card"><Headphones size={18} /><div><strong>Live catalog</strong><small>Admin-managed prices</small></div></div>
          </div>
        </section>

        <section className="brand-strip">{products.slice(0,8).map((product)=><span key={product.slug}>{product.name}</span>)}</section>

        <section className="section-wrap section" id="categories">
          <div className="section-heading centered"><div className="eyebrow"><span></span> Shop by category</div><h2>Everything you need to learn, create and grow.</h2><p>Select a category to find the right tool quickly.</p></div>
          <div className="category-grid">{categories.filter((category)=>category!=='All').map((category)=>{const Icon=categoryIcons[category]||Sparkles;const count=products.filter((product)=>product.category===category).length;return <button className="category-card" key={category} onClick={()=>chooseCategory(category)}><span className="category-icon"><Icon size={21}/></span><span><strong>{category}</strong><small>{count} tools</small></span><ArrowRight size={18}/></button>})}</div>
        </section>

        <section className="products-section section" id="products"><div className="section-wrap">
          <div className="section-heading row-heading"><div><div className="eyebrow"><span></span> Product catalog</div><h2>{activeCategory==='All'?'Featured tools':activeCategory}</h2></div><div className="search-box"><Search size={18}/><input value={query} onChange={(event)=>{setQuery(event.target.value);setShowAll(true)}} placeholder="Search tools..."/></div></div>
          {dataError && <div className="form-error">Store data error: {dataError}</div>}
          <div className="filter-row">{categories.map((category)=><button className={activeCategory===category?'filter-chip active':'filter-chip'} key={category} onClick={()=>{setActiveCategory(category);if(category!=='All')setShowAll(true)}}>{category}</button>)}</div>
          {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product,index)=>{
            const soldOut=product.status==='stock_out'
            const hasOffer=product.status==='offer'
            const availablePlans=productPlans(product)
            const oldPrice=availablePlans.find((plan)=>plan.compare_at_price)?.compare_at_price
            return <article className={`product-card ${soldOut?'product-sold-out':''}`} key={product.slug}>
              <div className="product-top"><span className={`product-logo tone-${(index%5)+1}`}>{product.initials}</span><span className={`tag ${hasOffer?'offer-tag':''}`}>{statusLabel(product)}</span></div>
              <div className="product-meta">{product.category}</div><h3>{product.name}</h3><p>{product.description}</p>
              <div className="store-price"><span>{soldOut?'Currently unavailable':'Starting from'}</span><strong>{soldOut?'Stock Out':priceLabel(product)}</strong>{oldPrice && hasOffer ? <del>৳{Number(oldPrice).toLocaleString('en-BD')}</del> : null}</div>
              <div className="store-actions"><button className="buy-now-button" disabled={soldOut} onClick={()=>buyNow(product)}>{soldOut?'Stock Out':'Buy Now'} {!soldOut&&<ArrowRight size={16}/>}</button><button className="add-cart-button" disabled={soldOut} onClick={()=>addToCart(product)}><ShoppingBag size={16}/> {cart.some((item)=>item.slug===product.slug)?'Added':'Add to Cart'}</button></div>
            </article>
          })}</div>:<div className="empty-state"><Search size={28}/><h3>No tools found</h3><p>Try another keyword or category.</p></div>}
          {activeCategory==='All'&&!query&&!showAll&&products.length>visibleProducts.length&&<div className="center-action"><button className="ghost-button" onClick={()=>setShowAll(true)}>View all {products.length} tools <ArrowRight size={17}/></button></div>}
        </div></section>

        <section className="section-wrap section" id="how-it-works"><div className="section-heading centered narrow"><div className="eyebrow"><span></span> Simple checkout</div><h2>No login. Just choose, pay and order.</h2><p>Prices, offers and availability are managed live from the store admin portal.</p></div><div className="feature-grid"><div className="feature-card"><span><ShoppingBag/></span><h3>1. Choose product</h3><p>Tap Buy Now for one tool or Add to Cart for multiple tools.</p></div><div className="feature-card"><span><Zap/></span><h3>2. Choose plan</h3><p>Select the available duration and see the current price or price range.</p></div><div className="feature-card"><span><ShieldCheck/></span><h3>3. Submit order</h3><p>Enter your name, phone and payment reference. No account creation required.</p></div></div></section>

        <section className="section-wrap section" id="faq"><div className="faq-layout"><div className="section-heading"><div className="eyebrow"><span></span> FAQ</div><h2>Questions, answered.</h2><p>Quick information before buying.</p></div><div className="faq-list"><details open><summary>Do I need an account?<ChevronDown size={18}/></summary><p>No. Customers can use Buy Now or Cart without signing up.</p></details><details><summary>Can prices change?<ChevronDown size={18}/></summary><p>Yes. Current selling prices, ranges and offers are managed by the store and appear automatically.</p></details><details><summary>What does Stock Out mean?<ChevronDown size={18}/></summary><p>The product is temporarily unavailable and cannot be added to cart until it becomes available again.</p></details><details><summary>Can I buy multiple tools together?<ChevronDown size={18}/></summary><p>Yes. Add multiple available products to the cart and complete them in one checkout.</p></details></div></div></section>

        <section className="section-wrap final-cta"><div><span className="eyebrow light"><span></span> Build your toolkit</span><h2>One place. More ways to create.</h2><p>Explore premium tools for study, work, coding, design, research and growth.</p></div><a className="light-button" href="#products">Shop now <ArrowRight size={18}/></a></section>
      </main>

      <footer><div className="section-wrap footer-grid"><div><a className="brand footer-brand" href="#top"><span className="brand-mark"><Sparkles size={19}/></span><span>AIMY</span></a><p>Premium digital tools for students, creators, developers and businesses.</p></div><div><strong>Explore</strong><a href="#products">Products</a><a href="#categories">Categories</a><a href="#how-it-works">How it works</a></div><div><strong>Categories</strong><a href="#products">AI tools</a><a href="#products">Academic tools</a><a href="#products">SEO tools</a></div><div><strong>Support</strong><a href="#faq">FAQ</a><a href="#how-it-works">Buying guide</a></div></div><div className="section-wrap footer-bottom"><span>© 2026 AIMY. All rights reserved.</span><span>Independent digital tools marketplace. Product names belong to their respective owners.</span></div></footer>

      {cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}></div>}
      <aside className={cartOpen?'cart-drawer open':'cart-drawer'} aria-hidden={!cartOpen}><div className="drawer-head"><div><small>Your selection</small><h3>Cart ({cart.length})</h3></div><button onClick={()=>setCartOpen(false)}><X/></button></div><div className="drawer-items">{cart.length===0?<div className="cart-empty"><ShoppingBag size={30}/><h4>Your cart is empty</h4><p>Add a tool to start your order.</p></div>:cart.map((item,index)=><div className="cart-item" key={item.slug}><span className={`mini-logo tone-${(index%5)+1}`}>{item.initials}</span><div><strong>{item.name}</strong><small>{priceLabel(item)}</small></div><button onClick={()=>removeFromCart(item.slug)}><X size={16}/></button></div>)}</div><div className="drawer-footer"><div className="checkout-note"><ShieldCheck size={17}/><span>No login required. Choose plan and checkout.</span></div><button className="primary-button full" disabled={cart.length===0} onClick={beginCheckout}>Checkout <ArrowRight size={18}/></button></div></aside>

      {checkoutOpen&&<CheckoutModal cart={cart} plans={plans} onClose={()=>setCheckoutOpen(false)} onSuccess={()=>setCart([])}/>}    
    </div>
  )
}

export default App
