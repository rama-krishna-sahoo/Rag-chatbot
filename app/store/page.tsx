// app/store/page.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { products, Product } from "@/data/products";
import { ProductCard } from "../components/ProductCards";
import { Chatbot } from "../components/Chatbox";
import { Search, ShoppingBag, Menu, Sparkles, ShieldCheck, Leaf, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState<any>(null);
  
  // Shopping Cart States
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true); // Open drawer on addition for positive reinforcement
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const categories = ["All", "Sleep", "Feeding", "Diapering", "Skincare", "Play", "Travel"];

  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <main className="min-h-screen bg-neutral-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 cursor-pointer group">
                <span className="text-3xl group-hover:rotate-12 transition-transform duration-300">🐢</span>
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-500 to-teal-700 bg-clip-text text-transparent hidden sm:block group-hover:from-emerald-600 group-hover:to-teal-800 transition-all duration-300">
                  Oogway
                </span>
              </div>
            </div>

            <div className="hidden md:flex space-x-8">
              <a href="#products" className="text-sm font-medium text-[#B2EA4D] border-b-2 border-emerald-600 pb-1 hover:text-emerald-800 transition-colors">Shop All</a>
              <a href="#products" onClick={() => setActiveCategory("All")} className="text-sm font-medium text-neutral-500 hover:text-[#B2EA4D] hover:-translate-y-0.5 transform transition-all">Best Sellers</a>
              <a href="#story" className="text-sm font-medium text-neutral-500 hover:text-[#B2EA4D] hover:-translate-y-0.5 transform transition-all">Our Story</a>
              <a href="#journal" className="text-sm font-medium text-neutral-500 hover:text-[#B2EA4D] hover:-translate-y-0.5 transform transition-all">Journal</a>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="pl-9 pr-4 py-1.5 text-sm rounded-full bg-neutral-100 text-neutral-800 placeholder:text-neutral-400 border-transparent focus:bg-white focus:border-emerald-350 focus:ring-2 focus:ring-emerald-100 transition-all w-48 lg:w-64 outline-none"
                />
              </div>

              {/* Shopping Cart Button */}
              <Button onClick={() => setCartOpen(true)} variant="ghost" size="icon" className="relative hover:bg-neutral-100 rounded-full">
                <ShoppingBag className="w-5 h-5 text-neutral-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#B2EA4D] text-[#203210] text-white text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-black font-mono shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Button>
              
              <div className="flex items-center gap-2">
                <a href="/admin">
                  <Button variant="outline" size="sm" className="inline-flex text-xs h-8 border-emerald-600 text-[#B2EA4D] hover:bg-emerald-50">
                    Admin Portal
                  </Button>
                </a>
                {user ? (
                  <div className="flex items-center gap-3 ml-2">
                    {user.user_metadata?.avatar_url && (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-neutral-200" />
                    )}
                    <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:inline-flex text-xs h-8">
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleLogin} size="sm" className="ml-2 bg-neutral-900 text-white hover:bg-neutral-800 text-xs h-8 px-4">
                    GitHub Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/natural_baby_hero.png"
          alt="Natural Baby Premium Products"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col items-start">
          <Badge className="mb-4 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 py-1 px-3 text-xs uppercase tracking-widest font-bold rounded-full shadow-sm">
            New Arrival
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 max-w-2xl leading-[1.15] tracking-tight">
            Pure, Gentle & <br/> Eco-Conscious Care
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-neutral-700 max-w-xl leading-relaxed">
            Discover our dermatologist-tested, 100% organic essentials designed to nurture your little one's sensitive skin.
          </p>
          <div className="mt-8 flex gap-4">
            <Button size="lg" className="rounded-full px-8 text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 text-white border-none">
              Shop Essentials
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base bg-white/50 backdrop-blur-sm border-neutral-300 text-neutral-900 hover:bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              Take the Quiz
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y border-neutral-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 sm:gap-16 opacity-70">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">100% Organic</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">Dermatologist Tested</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">Hypoallergenic</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Our Products
            </h2>
            <p className="mt-2 text-neutral-500 max-w-xl">
              Carefully crafted for every stage of your baby's journey. Not sure what you need? Ask our AI assistant in the corner!
            </p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto hide-scrollbar">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className={`rounded-full whitespace-nowrap transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${activeCategory === cat ? "bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 text-white" : "bg-white text-neutral-600 border-neutral-200 hover:border-[#B2EA4D]/50 hover:text-[#B2EA4D]"}`}
                onClick={() => setActiveCategory(cat)}
                size="sm"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-neutral-500">No products found in this category.</p>
            <Button variant="link" onClick={() => setActiveCategory("All")} className="mt-2">
              View all products
            </Button>
          </div>
        )}
      </div>

      {/* Our Story Section */}
      <section id="story" className="py-16 bg-white border-t border-neutral-200 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our Story</h2>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Founded with a passion for natural care, Oogway believes that every baby deserves the purest start in life. Our journey began with a simple mission: to provide eco-conscious, gentle products that nurture your little one and protect our planet.
          </p>
        </div>
      </section>

      {/* Journal Section */}
      <section id="journal" className="py-16 bg-neutral-50 border-t border-neutral-200 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Journal</h2>
          <p className="text-lg text-neutral-600 leading-relaxed mb-8">
            Tips, guides, and stories for mindful parenting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer">
              <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Guide</Badge>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">The Ultimate Organic Skincare Routine</h3>
              <p className="text-neutral-500 text-sm">Learn how to protect your baby's sensitive skin with our natural regimen.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer">
              <Badge className="mb-3 bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Tips</Badge>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Eco-Friendly Diapering 101</h3>
              <p className="text-neutral-500 text-sm">Everything you need to know about transitioning to sustainable diapering.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-neutral-500">
          <p>© 2026 Oogway. All rights reserved. Gentle care for little ones.</p>
        </div>
      </footer>

      {/* Shopping Cart Side Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <div 
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-300 cursor-pointer" 
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-neutral-200">
              {/* Cart Header */}
              <div className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#B2EA4D]" />
                  <h2 className="text-lg font-bold text-neutral-950">Your Shopping Cart</h2>
                  {cartCount > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-extrabold font-mono">{cartCount}</span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setCartOpen(false)}
                  className="rounded-full hover:bg-neutral-200/50 text-neutral-500 hover:text-neutral-950 transition-colors"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Cart Item List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <span className="text-4xl mb-4">🛒</span>
                    <p className="text-neutral-900 font-bold">Your cart is empty</p>
                    <p className="text-neutral-500 text-xs mt-1">Add items from the store or ask the AI assistant!</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 p-4 border border-neutral-100 rounded-2xl shadow-sm bg-neutral-50/50 hover:bg-neutral-50 transition-colors items-center">
                      <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 relative overflow-hidden border border-neutral-205">
                        <img 
                          src={item.product.slug === "organic-swaddle-wrap" ? "/images/organic_swaddle.png" : item.product.slug === "bamboo-feeding-bottle" ? "/images/bamboo_bottle.png" : "/images/natural_baby_hero.png"} 
                          alt={item.product.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-neutral-950 truncate">{item.product.name}</h4>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">${item.product.price.toFixed(2)}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 border border-neutral-300 text-neutral-600 rounded flex items-center justify-center hover:bg-neutral-200 text-xs font-bold transition-colors"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold w-6 text-center font-mono">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 border border-neutral-300 text-neutral-600 rounded flex items-center justify-center hover:bg-neutral-200 text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-[#B2EA4D]">${(item.product.price * item.quantity).toFixed(2)}</p>
                        <button 
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-[10px] text-neutral-400 hover:text-red-500 mt-2 font-bold underline transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-neutral-200 bg-neutral-50">
                  <div className="space-y-1.5 mb-6">
                    <div className="flex justify-between text-sm text-neutral-500 font-medium">
                      <span>Subtotal</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-neutral-500 font-medium">
                      <span>Shipping</span>
                      <span className="text-[#B2EA4D] font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-neutral-950 pt-1.5 border-t border-neutral-200/60">
                      <span>Estimated Total</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      alert(`Proceeding to checkout with total: $${cartSubtotal.toFixed(2)}`);
                      setCart([]);
                      setCartOpen(false);
                    }}
                    className="w-full h-11 bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Chatbot */}
      <Chatbot onAddToCart={handleAddToCart} />
    </main>
  );
}

// Temporary workaround for missing Badge component in this file since we use it in the hero
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</span>;
}
