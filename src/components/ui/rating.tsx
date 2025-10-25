"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function Rating({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  interactive = false, 
  onRatingChange,
  className 
}: RatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  const handleClick = (newRating: number) => {
    if (interactive && onRatingChange) {
      setCurrentRating(newRating);
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (newRating: number) => {
    if (interactive) {
      setHoverRating(newRating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = interactive ? (hoverRating || currentRating) : rating;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= displayRating;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              isFilled 
                ? "text-yellow-400 fill-current" 
                : "text-gray-300",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => handleClick(starRating)}
            onMouseEnter={() => handleMouseEnter(starRating)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}

interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function RatingDisplay({ 
  rating, 
  reviewCount, 
  size = "md", 
  showCount = true,
  className 
}: RatingDisplayProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Rating rating={rating} size={size} />
      {showCount && (
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} {reviewCount && `(${reviewCount} reviews)`}
        </span>
      )}
    </div>
  );
}

interface RatingFormProps {
  onSubmit: (rating: number, comment?: string) => void;
  loading?: boolean;
  className?: string;
}

export function RatingForm({ onSubmit, loading = false, className }: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0) {
      onSubmit(rating, comment.trim() || undefined);
      setRating(0);
      setComment("");
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className={cn(
          "text-sm text-blue-600 hover:text-blue-700 underline",
          className
        )}
        disabled={loading}
      >
        Rate this service
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating *
        </label>
        <Rating 
          rating={rating} 
          interactive={true} 
          onRatingChange={setRating}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comment (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={rating === 0 || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Submit Rating"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
