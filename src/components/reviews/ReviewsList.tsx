"use client";

import React, { useState, useEffect } from "react";
import { RatingDisplay } from "@/components/ui/rating";
import { Star, User } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  tip_amount: number;
  created_at: string;
  reviewer: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

interface ReviewsListProps {
  serviceId: string;
}

export default function ReviewsList({ serviceId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews?service_id=${serviceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setReviews(data.reviews || []);
          }
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchReviews();
    }
  }, [serviceId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No reviews yet. Be the first to review this service!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Reviews ({reviews.length})
      </h3>
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-start gap-3 mb-2">
            {review.reviewer.avatar_url ? (
              <img
                src={review.reviewer.avatar_url}
                alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {review.reviewer.first_name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-900">
                  {review.reviewer.first_name} {review.reviewer.last_name}
                </p>
                <RatingDisplay rating={review.rating} size="sm" showCount={false} />
              </div>
              <p className="text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {review.review_text && (
            <p className="text-gray-700 mt-2">{review.review_text}</p>
          )}
          {review.tip_amount > 0 && (
            <div className="mt-2 text-sm text-green-600 font-semibold">
              Tipped ${review.tip_amount.toFixed(2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

