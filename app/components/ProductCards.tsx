// components/ProductCard.tsx

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "../../data/products";
import { ShoppingBag, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: Product }) {
  // Use generated images where applicable, otherwise fallback to a styled placeholder
  const getProductImage = (slug: string) => {
    if (slug === "organic-swaddle-wrap") return "/images/organic_swaddle.png";
    if (slug === "bamboo-feeding-bottle") return "/images/bamboo_bottle.png";
    return "/images/natural_baby_hero.png"; // Fallback to hero for now as a generic placeholder
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg group border-muted">
      {/* Product Image Section */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
        <Image
          src={getProductImage(product.slug)}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-xs text-foreground hover:bg-white">
            {product.category}
          </Badge>
          {product.id === "nb-1" && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">
              Best Seller
            </Badge>
          )}
        </div>
      </div>

      {/* Product Info Section */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[40px]">
            {product.shortDescription}
          </p>
        </div>
        
        <div className="mt-2 space-y-2 flex-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="font-medium text-foreground mr-1">Age:</span> {product.ageRange}
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 mt-1 pl-4 list-disc">
            {product.keyFeatures.slice(0, 2).map((f) => (
              <li key={f} className="line-clamp-1">{f}</li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1 rounded-full shadow-sm" variant="default">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Bag
          </Button>
          <Button variant="outline" size="icon" className="rounded-full shadow-sm text-muted-foreground" title="Ask Assistant about this product">
            <MessageCircleQuestion className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
