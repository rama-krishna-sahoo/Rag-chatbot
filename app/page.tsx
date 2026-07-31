"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { products } from "../data/products";
import { ProductCard } from "./components/ProductCards";
import { Chatbot } from "./components/Chatbox";
import { Search, ShoppingBag, Menu, Sparkles, ShieldCheck, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState<any>(null);

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

  const categories = ["All", "Sleep", "Feeding", "Diapering", "Skincare", "Play", "Travel"];

  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <main className="min-h-screen bg-neutral-50 font-sans selection:bg-primary/20">
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
              <a href="#products" className="text-sm font-medium text-emerald-700 border-b-2 border-emerald-600 pb-1 hover:text-emerald-800 transition-colors">Shop All</a>
              <a href="#products" onClick={() => setActiveCategory("All")} className="text-sm font-medium text-neutral-500 hover:text-emerald-600 hover:-translate-y-0.5 transform transition-all">Best Sellers</a>
              <a href="#story" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 hover:-translate-y-0.5 transform transition-all">Our Story</a>
              <a href="#journal" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 hover:-translate-y-0.5 transform transition-all">Journal</a>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="pl-9 pr-4 py-1.5 text-sm rounded-full bg-neutral-100 border-transparent focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all w-48 lg:w-64 outline-none"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="w-5 h-5 text-neutral-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </Button>
              
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 py-1 px-3 text-xs uppercase tracking-widest font-semibold rounded-full shadow-sm">
            New Arrival
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 max-w-2xl leading-[1.15] tracking-tight">
            Pure, Gentle & <br/> Eco-Conscious Care
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-neutral-700 max-w-xl leading-relaxed">
            Discover our dermatologist-tested, 100% organic essentials designed to nurture your little one's sensitive skin.
          </p>
          <div className="mt-8 flex gap-4">
            <Button size="lg" className="rounded-full px-8 text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
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
                className={`rounded-full whitespace-nowrap transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${activeCategory === cat ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white text-neutral-600 border-neutral-200 hover:border-emerald-300 hover:text-emerald-600"}`}
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
            <ProductCard key={product.id} product={product} />
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

      {/* Floating Chatbot */}
      <Chatbot />
    </main>
  );
}

// Temporary workaround for missing Badge component in this file since we use it in the hero
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</span>;
}
